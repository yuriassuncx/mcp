import { Tool } from "@deco/mcp";
import { list } from "../../sdk/composio/index.ts";
import { listFromDeco } from "../../utils.ts";

export interface MCP extends Tool {
  provider: string;
  resolveType: string;
  id: string;
}

const listFromComposio = list;

const matcher = (query: string) => {
  const lower = query.toLowerCase();
  return ({ name, description }: { name: string; description: string }) =>
    name.toLowerCase().includes(lower) ||
    description.toLowerCase().includes(lower);
};

/**
 * @name SEARCH
 * @description Search for integrations by name or description. If no query is provided, all integrations will be returned.
 */
export default async function loader(
  { query = "", provider }: { query?: string; provider?: string } = {},
): Promise<MCP[]> {
  const [composio, deco] = await Promise.all([
    !provider || provider === "composio" ? listFromComposio() : [],
    !provider || provider === "deco" ? listFromDeco() : [],
  ]);

  const list = [];
  const matches = matcher(query);

  for (const item of deco) {
    if (!matches(item)) {
      continue;
    }
    list.push({ ...item, id: item.name, provider: "deco" });
  }

  for (const item of composio) {
    if (!matches(item)) {
      continue;
    }
    list.push({ ...item, provider: "composio" });
  }

  return list as MCP[];
}
