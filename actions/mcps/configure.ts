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
  /**
   * @description The type of connection to use
   */
  connectionType?: "HTTP"
}
const envName = Deno.env.get("DECO_ENV_NAME");
const siteName = Deno.env.get("DECO_SITE_NAME");
const subdomain = envName ? `${envName}--${siteName}` : siteName;
const MY_DOMAIN = `https://${subdomain}.deco.site`;
/**
 * @name CONFIGURE_MCP
 * @description Configure an MCP and returns its url
 */
export default async function configureMCP(
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
      connectionType: "HTTP",
    };
  }
  const installId = crypto.randomUUID();
  await ctx.installStorage.setItem(installId, {
    [props.name]: { ...props.props, __resolveType: resolveType },
  });
  return {
    success: true,
    url: `${MY_DOMAIN}/apps/${props.name}/${installId}/mcp/messages`,
  };
}
