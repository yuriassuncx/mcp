import { MCP } from "../loaders/mcps/list.ts";
import { AppContext } from "../apps/site.ts";

export interface Props {
  mcps?: MCP[];
}

export const loader = async (
  props: Props,
  _req: Request,
  ctx: AppContext,
) => {
  const mcps = await ctx.invoke.site.loaders.mcps.list();
  return { ...props, mcps };
};

export default function Home({ mcps = [] }: Props) {
  return (
    <div class="container mx-auto p-4">
      <h1 class="text-4xl font-bold mb-8">Available MCPs</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mcps.map((mcp) => (
          <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h2 class="text-2xl font-semibold mb-2">{mcp.name}</h2>
            <p class="text-gray-600 mb-4">{mcp.description}</p>
            <a
              href={`/mcp/${mcp.name}`}
              class="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Configure
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
