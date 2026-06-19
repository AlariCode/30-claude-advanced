import { Inject, Injectable, Logger } from '@nestjs/common'
import { IncomingMessage, ServerResponse } from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { McpToolRegistrar, MCP_TOOL_REGISTRAR } from './mcp-tool-registrar.interface'

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name)

  constructor(@Inject(MCP_TOOL_REGISTRAR) private readonly registrars: McpToolRegistrar[]) {}

  async handleRequest(req: IncomingMessage, res: ServerResponse, body: unknown): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    const server = new McpServer({ name: 'meeting-tasks', version: '1.0.0' })
    for (const registrar of this.registrars) {
      registrar.register(server)
    }
    await server.connect(transport)
    try {
      await transport.handleRequest(req, res, body)
    } finally {
      await transport.close()
    }
    this.logger.debug(`MCP ${req.method} handled`)
  }
}
