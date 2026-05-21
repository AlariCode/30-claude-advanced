import { FastifyRequest } from 'fastify'

export type AuthRequest = FastifyRequest & { user: { id: string; email: string } }
