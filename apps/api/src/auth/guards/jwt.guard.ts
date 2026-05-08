import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { FastifyRequest } from 'fastify'

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const authHeader = request.headers['authorization']

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException()
    }

    const token = authHeader.slice(7)

    try {
      const payload = this.jwt.verify<{ sub: string; email: string }>(token)
      ;(request as FastifyRequest & { user: { id: string; email: string } }).user = {
        id: payload.sub,
        email: payload.email,
      }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
