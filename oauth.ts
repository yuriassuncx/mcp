import { Hono } from "@hono/hono";
import { env } from "@hono/hono/adapter";
import { MCPInstance, MCPState } from "./registry.ts";
import { findCompatibleApp, invoke, parseInvokeResponse } from "./utils.ts";

const OAUTH_START_LOADER = "/loaders/oauth/start.ts";
const OAUTH_CALLBACK_ACTION = "/actions/oauth/callback.ts";

interface StateProvider {
  original_state?: string;
  code_verifier?: string;
}
interface State {
  appName: string;
  installId: string;
  invokeApp: string;
  returnUrl?: string | null;
  redirectUri?: string | null;
}

export const StateBuilder = {
  build: (
    appName: string,
    installId: string,
    invokeApp: string,
    returnUrl?: string | null,
    redirectUri?: string | null,
  ) => {
    // Validar parâmetros obrigatórios
    if (!appName || !installId || !invokeApp) {
      throw new Error("Missing required parameters for state building");
    }
    
    return encodeURIComponent(btoa(JSON.stringify({
      appName,
      installId,
      invokeApp,
      returnUrl: returnUrl || null,
      redirectUri: redirectUri || null,
    })));
  },
  parse: (state: string): State & StateProvider => {
    if (!state) {
      throw new Error("State parameter is required");
    }
    
    try {
      const decoded = atob(decodeURIComponent(state));
      const parsed = JSON.parse(decoded) as State & StateProvider;

      // Validação rápida dos campos obrigatórios
      if (!parsed.appName?.trim() || !parsed.installId?.trim() || !parsed.invokeApp?.trim()) {
        throw new Error("Invalid state: missing or invalid required fields");
      }

      if (parsed.original_state) {
        return StateBuilder.parse(parsed.original_state);
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse state: ${error}`);
    }
  },
};

interface WellKnownOAuthApps {
  [key: string]: {
    clientIdKey: string;
    clientSecretKey: string;
    scopes?: string;
  };
}

const WELL_KNOWN_OAUTH_APPS: WellKnownOAuthApps = {
  "github": {
    clientIdKey: "OAUTH_CLIENT_ID_GITHUB",
    clientSecretKey: "OAUTH_CLIENT_SECRET_GITHUB",
  },
  "google": {
    clientIdKey: "OAUTH_CLIENT_ID_GOOGLE",
    clientSecretKey: "OAUTH_CLIENT_SECRET_GOOGLE",
  },
  "airtable": {
    clientIdKey: "OAUTH_CLIENT_ID_AIRTABLE",
    clientSecretKey: "OAUTH_CLIENT_SECRET_AIRTABLE",
  },
  "slack": {
    clientIdKey: "OAUTH_CLIENT_ID_SLACK",
    clientSecretKey: "OAUTH_CLIENT_SECRET_SLACK",
  },
  "spotify": {
    clientIdKey: "SPOTIFY_CLIENT_ID",
    clientSecretKey: "SPOTIFY_CLIENT_SECRET",
  },
};

const extractProviderFromAppName = (appName: string): string | null => {
  if (!appName) {
    return null;
  }
  
  const normalizedName = appName.toLowerCase();
  const knownProviders = Object.keys(WELL_KNOWN_OAUTH_APPS);

  if (knownProviders.includes(normalizedName)) {
    return normalizedName;
  }

  for (const provider of knownProviders) {
    if (normalizedName.startsWith(provider)) {
      const afterProvider = normalizedName.substring(provider.length);
      const hasSeparator = afterProvider.startsWith("-") ||
        afterProvider.startsWith("_");
      const hasUppercase = /^[A-Z]/.test(appName.substring(provider.length));

      if (afterProvider === "" || hasSeparator || hasUppercase) {
        return provider;
      }
    }
  }

  return null;
};

const getOAuthConfigForApp = (appName: string) => {
  if (!appName) {
    return null;
  }
  
  const provider = extractProviderFromAppName(appName);
  return provider ? WELL_KNOWN_OAUTH_APPS[provider] : null;
};

interface OAuthStartParams {
  appName: string;
  returnUrl?: string | null;
  installId: string;
  instance: MCPInstance;
  envVars: Record<string, unknown>;
  invoke: MCPState["Variables"]["invoke"];
}

// deno-lint-ignore no-explicit-any
export const startOAuth = async (params: OAuthStartParams): Promise<any> => {
  const { appName, installId, instance, returnUrl, envVars, invoke } = params;

  // Validação rápida dos parâmetros de entrada
  if (!appName?.trim() || !installId?.trim() || !instance || !envVars || typeof invoke !== 'function') {
    console.error("Missing or invalid required parameters:", { 
      appName: !!appName?.trim(), 
      installId: !!installId?.trim(), 
      instance: !!instance, 
      envVars: !!envVars, 
      invoke: typeof invoke 
    });
    return null;
  }

  const redirectUri = new URL(`/oauth/callback`, "https://mcp.deco.site");
  
  const invokeApp = await findCompatibleApp(instance, OAUTH_START_LOADER);
  if (!invokeApp) {
    console.error(`No compatible app found for OAuth start loader: ${OAUTH_START_LOADER}`);
    return null;
  }

  const oauthApp = getOAuthConfigForApp(appName);
  if (!oauthApp) {
    console.error(`No OAuth configuration found for app: ${appName}`);
    return null;
  }

  const clientId = envVars[oauthApp.clientIdKey];
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    console.error(`Missing or invalid OAuth client ID for app: ${appName}, key: ${oauthApp.clientIdKey}`);
    return null;
  }

  try {
    const state = StateBuilder.build(appName, installId, invokeApp, returnUrl, redirectUri.href);
    const oauthStartLoader = `${invokeApp}${OAUTH_START_LOADER}`;
    
    const props = {
      installId,
      appName,
      redirectUri: redirectUri.href,
      state,
      returnUrl: returnUrl || null,
      clientId: String(clientId),
      scopes: oauthApp.scopes || undefined,
    };

    return await invoke(oauthStartLoader, props);
  } catch (error) {
    console.error("Error in startOAuth:", error);
    return null;
  }
};

export const withOAuth = (
  app: Hono<
    MCPState
  >,
) => {
  app.get("/oauth/start", async (c) => {
    const appName = c.var.appName;
    const installId = c.var.installId;
    const envVars = env(c);
    const url = new URL(c.req.url);
    const returnUrl = url.searchParams.get("returnUrl");

    // Validação rápida dos parâmetros obrigatórios
    if (!appName?.trim() || !installId?.trim() || !c.var.instance) {
      console.error("Missing required OAuth parameters:", { 
        appName: !!appName?.trim(), 
        installId: !!installId?.trim(), 
        instance: !!c.var.instance 
      });
      return c.json({ error: "Missing required parameters" }, 400);
    }

    try {
      const result = await startOAuth({
        returnUrl,
        appName,
        installId,
        instance: c.var.instance,
        envVars,
        invoke: async (key: string, props: any) => {
          // Validação rápida dos parâmetros
          if (!key?.trim() || typeof props !== 'object' || props === null) {
            throw new Error("Invalid parameters for invoke");
          }
          
          return await invoke(key, props, c);
        },
      });

      if (!result) {
        return c.json({ error: "App not found" }, 404);
      }

      return parseInvokeResponse(result, c) ?? new Response(null, { status: 204 });
    } catch (error) {
      console.error("Error in OAuth start route:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
  app.get("/oauth/callback", async (c) => {
    const state = c.req.query("state");

    if (!state) {
      return c.json({ error: "State is required" }, 400);
    }

    try {
      const { appName, installId, invokeApp, returnUrl, redirectUri } = StateBuilder.parse(state);

      // Validação rápida dos parâmetros obrigatórios
      if (!appName?.trim() || !installId?.trim() || !invokeApp?.trim()) {
        console.error("Missing required OAuth callback parameters:", { appName, installId, invokeApp });
        return c.json({ error: "Invalid state parameter" }, 400);
      }

      const envVars = env(c);
      const oauthApp = getOAuthConfigForApp(appName);

      if (!oauthApp) {
        return c.json({ error: `App ${appName} not found` }, 404);
      }
      
      interface OAuthCallbackProps {
        installId: string;
        appName: string;
        code: string | undefined;
        state: string;
        returnUrl?: string | null;
        redirectUri?: string | null;
        clientId: string;
        clientSecret: string;
        queryParams?: Record<string, string | boolean | undefined>;
      }

      const oauthCallbackAction = `${invokeApp}${OAUTH_CALLBACK_ACTION}`;
      const props: OAuthCallbackProps = {
        installId,
        appName,
        code: c.req.query("code"),
        state,
        returnUrl,
        redirectUri,
        clientId: envVars[oauthApp.clientIdKey] as string,
        clientSecret: envVars[oauthApp.clientSecretKey] as string,
        queryParams: {
          savePermission: c.req.query("savePermission") === "true" ? true : false,
          continue: c.req.query("continue") === "true" ? true : false,
          permissions: c.req.query("permissions") ?? undefined,
        },
      };

      const response = await invoke(oauthCallbackAction, props, c);
      const isHtml = response?.headers.get("content-type")?.includes("text/html");

      if (response && returnUrl && !isHtml) {
        const { installId, name, account } = await response.json();
        const thisUrl = new URL(c.req.url);
        thisUrl.protocol = "https:";
        if (thisUrl.hostname === "localhost") {
          thisUrl.protocol = "http:";
        }
        const url = new URL(returnUrl);
        url.searchParams.set("appName", appName);
        url.searchParams.set("installId", installId);
        url.searchParams.set(
          "mcpUrl",
          new URL(`/apps/${appName}/${installId}/mcp/messages`, thisUrl.origin).href,
        );
        name && url.searchParams.set("name", name);
        account && url.searchParams.set("account", account);
        return c.redirect(url.toString());
      }

      if (!response) {
        return c.html("<html><body>Success! You may close this window.</body></html>");
      }
      return response;
    } catch (error) {
      console.error("Error in OAuth callback route:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
};
