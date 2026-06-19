import { All, Controller, Req, Res } from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { McpService } from './mcp.service'

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @All()
  async handleMcpRequest(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) res: FastifyReply,
  ): Promise<void> {
    res.hijack()
    await this.mcpService.handleRequest(req.raw, res.raw, req.body)
  }
}
