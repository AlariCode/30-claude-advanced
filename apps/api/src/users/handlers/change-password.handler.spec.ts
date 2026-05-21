import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ChangePasswordHandler } from './change-password.handler'
import { ChangePasswordCommand } from '../commands/change-password.command'

const mockCompare = jest.fn()
const mockHash = jest.fn()

jest.mock('bcrypt', () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
  hash: (...args: unknown[]) => mockHash(...args),
}))

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

describe('ChangePasswordHandler', () => {
  let handler: ChangePasswordHandler

  beforeEach(() => {
    jest.clearAllMocks()
    handler = new ChangePasswordHandler(mockPrisma as any)
  })

  it('выбрасывает NotFoundException если пользователь не найден', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const command = new ChangePasswordCommand('user-1', 'OldPass1!', 'NewPass1!')

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
    expect(mockCompare).not.toHaveBeenCalled()
  })

  it('выбрасывает BadRequestException если старый пароль неверен', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed' })
    mockCompare.mockResolvedValue(false)
    const command = new ChangePasswordCommand('user-1', 'WrongPass1!', 'NewPass1!')

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException)
    expect(mockHash).not.toHaveBeenCalled()
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('обновляет пароль если старый пароль верен', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed' })
    mockCompare.mockResolvedValue(true)
    mockHash.mockResolvedValue('new-hashed')
    mockPrisma.user.update.mockResolvedValue({})
    const command = new ChangePasswordCommand('user-1', 'OldPass1!', 'NewPass1!')

    await handler.execute(command)

    expect(mockHash).toHaveBeenCalledWith('NewPass1!', 10)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'new-hashed' },
    })
  })

  it('возвращает void после успешной смены пароля', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed' })
    mockCompare.mockResolvedValue(true)
    mockHash.mockResolvedValue('new-hashed')
    mockPrisma.user.update.mockResolvedValue({})
    const command = new ChangePasswordCommand('user-1', 'OldPass1!', 'NewPass1!')

    const result = await handler.execute(command)

    expect(result).toBeUndefined()
  })
})
