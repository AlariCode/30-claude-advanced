import { All, Controller, Req, Res, UseGuards } from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { McpAuthGuard, McpRequest } from './guards/mcp-auth.guard'
import { McpService } from './mcp.service'

@UseGuards(McpAuthGuard)
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @All()
  async handleMcpRequest(
    @Req() req: McpRequest,
    @Res({ passthrough: false }) res: FastifyReply,
  ): Promise<void> {
    res.hijack()
    await this.mcpService.handleRequest(req.raw, res.raw, req.body, req.requester)
  }
}
