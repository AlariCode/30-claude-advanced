import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ValidationPipe } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

type TextContent = { type: 'text'; text: string }
type ToolResult = { isError?: boolean; content: TextContent[] }

describe('MCP HTTP endpoint (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let client: Client
  let meetingId: string
  let taskId: string

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
    await app.listen(0, '127.0.0.1')

    const appUrl = await app.getUrl()

    prisma = app.get(PrismaService)
    await prisma.task.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({ where: { email: 'mcp-owner@example.com' } })

    const owner = await prisma.user.create({
      data: { email: 'mcp-owner@example.com', password: 'hashed' },
    })

    const meeting = await prisma.meeting.create({
      data: { title: 'Sprint Planning', date: new Date(), ownerId: owner.id },
    })
    meetingId = meeting.id

    const tasks = await prisma.task.createManyAndReturn({
      data: [
        { title: 'Fix login bug', sourceMeetingId: meetingId },
        { title: 'Write tests for login', sourceMeetingId: meetingId },
        { title: 'Deploy to prod', sourceMeetingId: meetingId },
      ],
    })
    taskId = tasks[0].id

    const jwtService = app.get(JwtService)
    const token = jwtService.sign({ sub: owner.id, email: owner.email })

    const transport = new StreamableHTTPClientTransport(new URL(`${appUrl}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    })
    client = new Client({ name: 'test-client', version: '1.0.0' })
    await client.connect(transport)
  })

  afterAll(async () => {
    await client.close().catch(() => null)
    await prisma.task.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({ where: { email: 'mcp-owner@example.com' } })
    await app.close()
  })

  it('сервер объявляет инструменты find_tasks и upsert_task', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name)
    expect(names).toContain('find_tasks')
    expect(names).toContain('upsert_task')
  })

  describe('find_tasks', () => {
    it('возвращает задачи, подходящие по запросу', async () => {
      const result = (await client.callTool({
        name: 'find_tasks',
        arguments: { query: 'login', meetingId },
      })) as ToolResult
      const tasks = JSON.parse(result.content[0].text) as Array<{ title: string }>
      expect(tasks).toHaveLength(2)
      expect(tasks.map((t) => t.title).sort()).toEqual(['Fix login bug', 'Write tests for login'])
    })

    it('возвращает пустой массив если ничего не найдено', async () => {
      const result = (await client.callTool({
        name: 'find_tasks',
        arguments: { query: 'nonexistent', meetingId },
      })) as ToolResult
      const tasks = JSON.parse(result.content[0].text) as unknown[]
      expect(tasks).toHaveLength(0)
    })
  })

  describe('upsert_task', () => {
    it('создаёт новую задачу', async () => {
      const result = (await client.callTool({
        name: 'upsert_task',
        arguments: { title: 'New upsert task', meetingId },
      })) as ToolResult
      expect(result.isError).toBeFalsy()
      const task = JSON.parse(result.content[0].text) as { title: string; status: string }
      expect(task.title).toBe('New upsert task')
      expect(task.status).toBe('OPEN')
    })

    it('обновляет статус существующей задачи', async () => {
      const result = (await client.callTool({
        name: 'upsert_task',
        arguments: { title: 'Deploy to prod', status: 'DONE', meetingId },
      })) as ToolResult
      expect(result.isError).toBeFalsy()
      const task = JSON.parse(result.content[0].text) as { title: string; status: string }
      expect(task.title).toBe('Deploy to prod')
      expect(task.status).toBe('DONE')
    })
  })

  describe('resource: tasks://open', () => {
    it('возвращает валидный массив задач', async () => {
      const { contents } = await client.readResource({ uri: 'tasks://open' })
      const tasks = JSON.parse((contents[0] as { text: string }).text) as unknown[]
      expect(Array.isArray(tasks)).toBe(true)
    })
  })

  describe('resource: task://{taskId}', () => {
    it('возвращает задачу по id', async () => {
      const { contents } = await client.readResource({ uri: `task://${taskId}` })
      const task = JSON.parse((contents[0] as { text: string }).text) as {
        id: string
        title: string
      }
      expect(task.id).toBe(taskId)
      expect(task.title).toBe('Fix login bug')
    })

    it('выбрасывает ошибку если задача не найдена', async () => {
      await expect(
        client.readResource({ uri: 'task://00000000-0000-0000-0000-000000000000' }),
      ).rejects.toThrow()
    })
  })

  describe('prompt: meeting_brief', () => {
    it('сервер объявляет промпт meeting_brief', async () => {
      const { prompts } = await client.listPrompts()
      expect(prompts.map((p) => p.name)).toContain('meeting_brief')
    })

    it('возвращает сообщение с названием встречи и списком задач', async () => {
      const result = await client.getPrompt({ name: 'meeting_brief', arguments: { meetingId } })
      expect(result.messages).toHaveLength(1)
      const text = (result.messages[0].content as { text: string }).text
      expect(text).toContain('Sprint Planning')
      expect(text).toContain('Fix login bug')
    })
  })

  describe('prompt: meeting_tasks_review', () => {
    it('сервер объявляет промпт meeting_tasks_review', async () => {
      const { prompts } = await client.listPrompts()
      expect(prompts.map((p) => p.name)).toContain('meeting_tasks_review')
    })

    it('возвращает сообщение с задачами встречи', async () => {
      const result = await client.getPrompt({
        name: 'meeting_tasks_review',
        arguments: { meetingId },
      })
      expect(result.messages).toHaveLength(1)
      const text = (result.messages[0].content as { text: string }).text
      expect(text).toContain('Sprint Planning')
      expect(text).toContain('Deploy to prod')
    })
  })
})
