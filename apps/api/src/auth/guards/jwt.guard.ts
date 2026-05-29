import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { FastifyRequest } from 'fastify'

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>()

    const token = this.extractToken(request)
    if (!token) throw new UnauthorizedException()

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

  private extractToken(request: FastifyRequest): string | undefined {
    const authHeader = request.headers['authorization']
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }

    const cookies = (request as FastifyRequest & { cookies?: Record<string, string | undefined> })
      .cookies
    return cookies?.['vm_token']
  }
}
