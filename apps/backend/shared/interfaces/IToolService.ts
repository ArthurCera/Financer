/**
 * IToolService
 *
 * Defines the contract for exposing tools (skills) that the LLM can call
 * during chat conversations. Follows MCP-compatible JSON Schema format for
 * tool definitions so it can be extracted to a standalone MCP server later.
 *
 * User-scoping: `executeTool()` takes `userId` as a parameter — every tool
 * execution is scoped to the authenticated user. The userId is never sourced
 * from tool arguments.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  name: string;
  result: unknown;
  error?: string;
}

export interface IToolService {
  listTools(): ToolDefinition[];
  executeTool(userId: string, call: ToolCallRequest): Promise<ToolCallResult>;
}
