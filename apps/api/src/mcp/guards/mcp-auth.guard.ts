import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { FastifyRequest } from 'fastify'

export type McpRequest = FastifyRequest & { requester: { userId: string } }

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>()

    const token = this.extractBearerToken(request)
    if (!token) throw new UnauthorizedException()

    try {
      const payload = this.jwt.verify<{ sub: string }>(token)
      ;(request as McpRequest).requester = { userId: payload.sub }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }

  private extractBearerToken(request: FastifyRequest): string | undefined {
    const authHeader = request.headers['authorization']
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }
    return undefined
  }
}
