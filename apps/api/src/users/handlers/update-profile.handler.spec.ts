import { UpdateProfileHandler } from './update-profile.handler'
import { UpdateProfileCommand } from '../commands/update-profile.command'

const mockPrisma = {
  user: {
    update: jest.fn(),
  },
}

describe('UpdateProfileHandler', () => {
  let handler: UpdateProfileHandler

  beforeEach(() => {
    jest.clearAllMocks()
    handler = new UpdateProfileHandler(mockPrisma as any)
  })

  it('обновляет name и avatarUrl, возвращает обновлённый профиль', async () => {
    const updated = {
      id: 'user-1',
      email: 'a@b.com',
      name: 'Bob',
      avatarUrl: 'https://x.com/a.png',
    }
    mockPrisma.user.update.mockResolvedValue(updated)

    const result = await handler.execute(
      new UpdateProfileCommand('user-1', 'Bob', 'https://x.com/a.png'),
    )

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Bob', avatarUrl: 'https://x.com/a.png' },
      select: { id: true, email: true, name: true, avatarUrl: true },
    })
    expect(result).toEqual(updated)
  })

  it('обновляет только name если avatarUrl не передан', async () => {
    const updated = { id: 'user-1', email: 'a@b.com', name: 'Bob', avatarUrl: null }
    mockPrisma.user.update.mockResolvedValue(updated)

    const result = await handler.execute(new UpdateProfileCommand('user-1', 'Bob', undefined))

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Bob' },
      select: { id: true, email: true, name: true, avatarUrl: true },
    })
    expect(result).toEqual(updated)
  })
})
