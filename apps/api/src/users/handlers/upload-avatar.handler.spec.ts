import { BadRequestException } from '@nestjs/common'
import { Readable } from 'stream'
import { UploadAvatarHandler } from './upload-avatar.handler'
import { UploadAvatarCommand } from '../commands/upload-avatar.command'

const mockPrisma = {
  user: {
    findUnique: jest.fn().mockResolvedValue({ avatarUrl: null }),
    update: jest.fn(),
  },
}

const mockMkdir = jest.fn().mockResolvedValue(undefined)
const mockUnlink = jest.fn().mockResolvedValue(undefined)
const mockStat = jest.fn().mockResolvedValue({ size: 100 })
const mockPipeline = jest.fn().mockResolvedValue(undefined)

 
jest.mock('fs', () => ({
  promises: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mkdir: (...args: any[]) => mockMkdir(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unlink: (...args: any[]) => mockUnlink(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stat: (...args: any[]) => mockStat(...args),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createWriteStream: (..._args: any[]) => ({}),
}))

jest.mock('stream/promises', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipeline: (...args: any[]) => mockPipeline(...args),
}))

describe('UploadAvatarHandler', () => {
  let handler: UploadAvatarHandler

  beforeEach(() => {
    jest.clearAllMocks()
    handler = new UploadAvatarHandler(mockPrisma as any)
  })

  it('выбрасывает BadRequestException для неразрешённого mime-типа', async () => {
    const stream = Object.assign(new Readable({ read() {} }), { resume: jest.fn() })
    const command = new UploadAvatarCommand('user-1', 'application/pdf', stream)

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException)
    expect(mockMkdir).not.toHaveBeenCalled()
  })

  it('принимает image/jpeg, сохраняет файл и обновляет avatarUrl в БД', async () => {
    const stream = new Readable({ read() {} })
    mockPrisma.user.update.mockResolvedValue({})
    const command = new UploadAvatarCommand('user-1', 'image/jpeg', stream)

    const result = await handler.execute(command)

    expect(mockMkdir).toHaveBeenCalled()
    expect(mockPipeline).toHaveBeenCalled()
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ avatarUrl: expect.stringContaining('/uploads/avatars/') }),
      }),
    )
    expect(result).toHaveProperty('avatarUrl')
    expect(result.avatarUrl).toMatch(/\/uploads\/avatars\/.+\.jpg$/)
  })

  it('принимает image/png и формирует .png расширение', async () => {
    const stream = new Readable({ read() {} })
    mockPrisma.user.update.mockResolvedValue({})
    const command = new UploadAvatarCommand('user-1', 'image/png', stream)

    const result = await handler.execute(command)

    expect(result.avatarUrl).toMatch(/\.png$/)
  })

  it('принимает image/webp и формирует .webp расширение', async () => {
    const stream = new Readable({ read() {} })
    mockPrisma.user.update.mockResolvedValue({})
    const command = new UploadAvatarCommand('user-1', 'image/webp', stream)

    const result = await handler.execute(command)

    expect(result.avatarUrl).toMatch(/\.webp$/)
  })

  it('удаляет файл и выбрасывает BadRequestException если размер > 5 МБ', async () => {
    const stream = new Readable({ read() {} })
    mockStat.mockResolvedValueOnce({ size: 6 * 1024 * 1024 })
    const command = new UploadAvatarCommand('user-1', 'image/jpeg', stream)

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException)
    expect(mockUnlink).toHaveBeenCalled()
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('удаляет файл и выбрасывает BadRequestException при FST_REQ_FILE_TOO_LARGE', async () => {
    const stream = new Readable({ read() {} })
    const err = Object.assign(new Error('too large'), { code: 'FST_REQ_FILE_TOO_LARGE' })
    mockPipeline.mockRejectedValueOnce(err)
    const command = new UploadAvatarCommand('user-1', 'image/jpeg', stream)

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException)
    expect(mockUnlink).toHaveBeenCalled()
  })

  it('удаляет старый файл после успешной загрузки нового', async () => {
    const stream = new Readable({ read() {} })
    mockPrisma.user.findUnique.mockResolvedValueOnce({ avatarUrl: '/uploads/avatars/old.jpg' })
    mockPrisma.user.update.mockResolvedValue({})
    const command = new UploadAvatarCommand('user-1', 'image/jpeg', stream)

    await handler.execute(command)

    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('old.jpg'))
  })

  it('не падает если у пользователя не было аватара', async () => {
    const stream = new Readable({ read() {} })
    mockPrisma.user.findUnique.mockResolvedValueOnce({ avatarUrl: null })
    mockPrisma.user.update.mockResolvedValue({})
    const command = new UploadAvatarCommand('user-1', 'image/jpeg', stream)

    await expect(handler.execute(command)).resolves.toHaveProperty('avatarUrl')
    expect(mockUnlink).not.toHaveBeenCalled()
  })
})
