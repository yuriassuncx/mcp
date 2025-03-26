import { MCP } from "site/loaders/mcps/list.ts";
import { AppContext } from "../../apps/site.ts";

export interface Props {
  /**
   * @description The name of the MCP to install
   */
  name: string;
  /**
   * @description The properties to pass to the MCP
   */
  props: Record<string, unknown>;
}

export interface InstallURL {
  /**
   * @descriptionThe URL to connect to the installed MCP
   */
  url: string | null;
  /**
   * @description Whether the installation was successful
   */
  success: boolean;
  /**
   * @description The message to display to the user
   */
  message?: string;
}

/**
 * @name INSTALL_MCP
 * @description Install an MCP
 */
export default async function installMCP(
  props: Props,
  _req: Request,
  ctx: AppContext,
): Promise<InstallURL> {
  const loaders = ctx.invoke.site.loaders;
  const list: MCP[] = await loaders.mcps.list();

  const resolveType = list.find((t) => t.name === props.name)?.resolveType;
  if (!resolveType) {
    return {
      url: null,
      success: false,
      message: `MCP ${props.name} not found`,
    };
  }
  const installId = crypto.randomUUID();
  await ctx.installStorage.setItem(installId, {
    [props.name]: { ...props.props, __resolveType: resolveType },
  });
  return {
    success: true,
    url: `/apps/${props.name}/${installId}/mcp/sse`,
  };
}
