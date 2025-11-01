import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { tool } from "ai";
import type { ToolPart } from "ai";
import { loadMCPConfigs, type MCPConfig } from "./mcp-config.js";

async function initializeMCPClient(config: MCPConfig): Promise<Record<string, ToolPart> | null> {
  try {
    const client = new Client(
      {
        name: "parsnip",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
    });

    await client.connect(transport);

    const toolsResult = await client.request(
      {
        method: "tools/list",
        params: {},
      },
      { schema: { type: "object" } }
    );

    const toolsObj: Record<string, ToolPart> = {};
    
    if (toolsResult && typeof toolsResult === 'object' && 'tools' in toolsResult) {
      const tools = (toolsResult as any).tools || [];
      for (const mcpTool of tools) {
        toolsObj[mcpTool.name] = tool({
          description: mcpTool.description || "",
          parameters: mcpTool.inputSchema || {},
        });
      }
    }

    await transport.close();
    return toolsObj;
  } catch (error) {
    console.error(`Failed to initialize MCP client for ${config.name}:`, error);
    return null;
  }
}

async function getAllMCPTools(): Promise<Record<string, ToolPart>> {
  const configs = loadMCPConfigs();
  const enabledConfigs = configs.filter((c) => c.enabled);

  if (enabledConfigs.length === 0) {
    return {};
  }

  const allTools: Record<string, ToolPart> = {};

  for (const config of enabledConfigs) {
    const tools = await initializeMCPClient(config);
    if (tools) {
      Object.assign(allTools, tools);
    }
  }

  return allTools;
}

export { getAllMCPTools };