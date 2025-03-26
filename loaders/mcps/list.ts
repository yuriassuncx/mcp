import { getTools, Tool } from "@deco/mcp";
import { MCP_REGISTRY } from "site/registry.ts";

export interface MCP extends Tool {
  resolveType: string;
}
/**
 * @name LIST_AVAILABLE_MCPS
 * @description List all available MCPs
 */
export default async function listMCPs(): Promise<MCP[]> {
  const names = new Map<string, string>();
  const schemas = await MCP_REGISTRY?.meta();
  const tools = getTools(names, schemas?.value.schema, { blocks: ["apps"] });
  return tools.filter((t) => t.name !== "main") as MCP[];
}
