import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const MCP_TOOL_REGISTRAR = Symbol('MCP_TOOL_REGISTRAR')

export interface Requester {
  userId: string
}

export interface McpToolRegistrar {
  register(server: McpServer, requester: Requester): void
}
