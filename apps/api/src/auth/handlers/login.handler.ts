import { UnauthorizedException } from '@nestjs/common'
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { FindUserByEmailQuery } from '../../users/queries/find-user-by-email.query'
import { UserRecord } from '../../users/handlers/find-user-by-email.handler'
import { LoginCommand } from '../commands/login.command'

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly jwt: JwtService,
  ) {}

  async execute(command: LoginCommand): Promise<{ token: string }> {
    const user = await this.queryBus.execute<FindUserByEmailQuery, UserRecord | null>(
      new FindUserByEmailQuery(command.email),
    )

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordMatch = await bcrypt.compare(command.password, user.password)
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return { token: this.jwt.sign({ sub: user.id, email: user.email }) }
  }
}
