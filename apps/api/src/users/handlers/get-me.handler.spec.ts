import { GetMeHandler } from './get-me.handler'
import { GetMeQuery } from '../queries/get-me.query'

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
}

describe('GetMeHandler', () => {
  let handler: GetMeHandler

  beforeEach(() => {
    jest.clearAllMocks()
    handler = new GetMeHandler(mockPrisma as any)
  })

  it('возвращает профиль пользователя по id', async () => {
    const user = { id: 'user-1', email: 'a@b.com', name: 'Alice', avatarUrl: null }
    mockPrisma.user.findUnique.mockResolvedValue(user)

    const result = await handler.execute(new GetMeQuery('user-1'))

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, email: true, name: true, avatarUrl: true },
    })
    expect(result).toEqual(user)
  })

  it('возвращает null если пользователь не найден', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const result = await handler.execute(new GetMeQuery('unknown'))

    expect(result).toBeNull()
  })
})
