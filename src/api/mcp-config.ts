type MCPConfig = {
  id: string;
  name: string;
  command: string;
  args: string[];
  enabled: boolean;
};

const DEFAULT_MCP_CONFIG: MCPConfig[] = [
  {
    id: "sequential-thinking",
    name: "Sequential Thinking",
    command: "npx",
    args: ["@modelcontextprotocol/server-sequential-thinking"],
    enabled: true,
  },
];

function loadMCPConfigs(): MCPConfig[] {
  if (typeof window === "undefined") {
    return DEFAULT_MCP_CONFIG;
  }

  try {
    const saved = localStorage.getItem("parsnip-mcps");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Failed to load MCP configs:", error);
  }

  return DEFAULT_MCP_CONFIG;
}

export { loadMCPConfigs, DEFAULT_MCP_CONFIG };
export type { MCPConfig };
