import { createMCP } from "@deco/mcp";
import {
  DiscohookMCPConfig,
  createDiscohookMCP,
  discohookMCP,
} from "../../sdk/discohook/index.ts";

export const discohookMcpConnector = createMCP<
  DiscohookMCPConfig,
  ReturnType<typeof createDiscohookMCP>
>({
  id: discohookMCP.id,
  name: discohookMCP.name,
  description: discohookMCP.description,
  icon: discohookMCP.icon,
  inputSchema: discohookMCP.inputSchema,
  outputSchema: discohookMCP.outputSchema,
  onInstall: async (config) => {
    return createDiscohookMCP(config);
  },
  onUpdate: async (config) => {
    return createDiscohookMCP(config);
  },
  onUninstall: async () => {
    // Não há necessidade de limpeza específica
    return;
  },
});

export default discohookMcpConnector; 