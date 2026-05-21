import { Body, Controller, Get, NotFoundException, Patch, Req, UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { AuthRequest } from '../auth/types'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { UpdateProfileCommand } from './commands/update-profile.command'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { GetMeQuery } from './queries/get-me.query'
import { UserProfile } from './types'

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('me')
  async getMe(@Req() req: AuthRequest): Promise<UserProfile> {
    const profile = await this.queryBus.execute<GetMeQuery, UserProfile | null>(
      new GetMeQuery(req.user.id),
    )
    if (!profile) throw new NotFoundException()
    return profile
  }

  @Patch('me')
  updateMe(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto): Promise<UserProfile> {
    return this.commandBus.execute(new UpdateProfileCommand(req.user.id, dto.name, dto.avatarUrl))
  }
}
