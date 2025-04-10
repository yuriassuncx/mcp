import { MCP_REGISTRY } from "../../registry.ts";
import { getTools, Tool } from "@deco/mcp";
import { list } from "../../sdk/composio/index.ts";

export interface MCP extends Tool {
  resolveType: string;
}

const listFromComposio = list;

const listFromDeco = async () => {
  const names = new Map<string, string>();
  const schemas = await MCP_REGISTRY?.meta();

  const tools = getTools(names, schemas?.value.schema, { blocks: ["apps"] });
  const list = tools.filter((t) =>
    t.name !== "site-apps-deco-htmx-ts"
  ) as MCP[];

  return list;
};

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
  { query = "" }: { query?: string } = {},
): Promise<MCP[]> {
  const [composio, deco] = await Promise.all([
    listFromComposio(),
    listFromDeco(),
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
