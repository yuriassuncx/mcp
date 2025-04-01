import { type DecoMCP, MCP } from "site/loaders/mcps/search.ts";
import { type ComposioMCP, install } from "site/sdk/composio/index.ts";
import { installStorage } from "../../apps/site.ts";
import getMCP from "../../loaders/mcps/get.ts";

export interface Props {
  /**
   * @description The id of the MCP to install
   */
  id: string;
  /**
   * @description ID of the install, its optional, if passed, will update the existing install
   */
  installId?: string;
  /**
   * @description The properties to pass to the MCP
   */
  props: Record<string, unknown>;
}

export interface ConfigurationResult {
  /**
   * @description Whether the installation was successful
   */
  success: boolean;
  /**
   * @description The message to display to the user
   */
  message?: string;
  /**
   * @description The data of the installed MCP
   */
  data: {
    /**
     * @description The name of the MCP
     */
    name: string;
    /**
     * @description The description of the MCP
     */
    description: string;
    /**
     * @description The icon of the MCP
     */
    icon: string;
    connection: {
      /**
       * @description The URL to connect to the installed MCP
       */
      url: string | null;
      /**
       * @description The type of connection to use
       */
      type: "HTTP" | "SSE";
    };
  };
}
const envName = Deno.env.get("DECO_ENV_NAME");
const siteName = Deno.env.get("DECO_SITE_NAME");
const subdomain = envName ? `${envName}--${siteName}` : siteName;
const MY_DOMAIN = `https://${subdomain}.deco.site`;

const configureDeco = async (
  integration: DecoMCP,
  config: Record<string, unknown>,
  installId?: string = crypto.randomUUID(),
) => {
  const resolveType = integration.resolveType;
  const id = integration.id;

  if (!resolveType) {
    return {
      url: null,
      success: false,
      message: `MCP ${id} not found`,
      connectionType: "HTTP",
    };
  }

  await installStorage.setItem(installId, {
    [id]: { ...config, __resolveType: resolveType },
  });

  return {
    success: true,
    connection: {
      url: `${MY_DOMAIN}/apps/${id}/${installId}/mcp/messages`,
      type: "HTTP",
    },
  };
};

const configureComposio = async (integration: ComposioMCP) => {
  const instanceId = await install(integration.id);

  return {
    success: true,
    connection: {
      url: instanceId,
      type: "SSE",
    },
  };
};

/**
 * @name CONFIGURE
 * @description Configure an MCP and returns its url
 */
export default async function configureMCP(
  props: Props,
): Promise<ConfigurationResult> {
  const integration: MCP | undefined = await getMCP({ id: props.id });

  if (!integration) {
    return {
      success: false,
      message: `MCP ${props.id} not found`,
      data: null,
    };
  }

  const { success, connection } = integration.provider === "composio"
    ? await configureComposio(integration)
    : await configureDeco(integration, props);

  return {
    success,
    data: {
      name: integration.name,
      description: integration.description,
      icon: integration.icon,
      connection,
    },
  };
}
