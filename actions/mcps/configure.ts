import { MCP } from "site/loaders/mcps/list.ts";
import { installStorage } from "../../apps/site.ts";
import { default as listMCPs } from "../../loaders/mcps/list.ts";

export interface Props {
  /**
   * @description The name of the MCP to install
   */
  name: string;
  /**
   * @description ID of the install, its optional, if passed, will update the existing install
   */
  installId?: string;
  /**
   * @description The properties to pass to the MCP
   */
  props: Record<string, unknown>;
}

export interface InstallURL {
  /**
   * @description The URL to connect to the installed MCP
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
  connectionType?: "HTTP";
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
): Promise<InstallURL> {
  const list: MCP[] = await listMCPs();

  const resolveType = list.find((t) => t.name === props.name)?.resolveType;
  if (!resolveType) {
    return {
      url: null,
      success: false,
      message: `MCP ${props.name} not found`,
      connectionType: "HTTP",
    };
  }
  const installId = props.installId ?? crypto.randomUUID();
  await installStorage.setItem(installId, {
    [props.name]: { ...props.props, __resolveType: resolveType },
  });
  return {
    success: true,
    url: `${MY_DOMAIN}/apps/${props.name}/${installId}/mcp/messages`,
    connectionType: "HTTP",
  };
}
