import { Hono } from "@hono/hono";
import { env } from "@hono/hono/adapter";
import { MCPInstance, MCPState } from "./registry.ts";
import {
  findCompatibleApp,
  invoke,
  parseInvokeResponse,
  schemaFromAppName,
} from "./utils.ts";
import {
  cleanupExpiredSessions,
  CustomBotState,
  invalidateSession,
  retrieveCustomBotSession,
} from "./utils/state-helpers.ts";

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
  integrationId?: string | null;
  botName?: string;
  sessionToken?: string;
  isCustomBot?: boolean;
}

export const StateBuilder = {
  build: (
    appName: string,
    installId: string,
    invokeApp: string,
    returnUrl?: string | null,
    redirectUri?: string | null,
    integrationId?: string | null,
    botName?: string,
  ) => {
    return encodeURIComponent(btoa(JSON.stringify({
      appName,
      installId,
      invokeApp,
      returnUrl,
      redirectUri,
      integrationId,
      botName,
    })));
  },
  parse: (state: string): State & StateProvider => {
    const decoded = atob(decodeURIComponent(state));
    const parsed = JSON.parse(decoded) as State & StateProvider;

    if (parsed.original_state) {
      return StateBuilder.parse(parsed.original_state);
    }

    return parsed;
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
  const normalizedName = appName?.toLowerCase();
  const knownProviders = Object.keys(WELL_KNOWN_OAUTH_APPS);

  if (knownProviders.includes(normalizedName)) {
    return normalizedName;
  }

  for (const provider of knownProviders) {
    if (normalizedName?.startsWith(provider)) {
      const afterProvider = normalizedName.substring(provider.length);
      const hasSeparator = afterProvider?.startsWith("-") ||
        afterProvider?.startsWith("_");
      const hasUppercase = /^[A-Z]/.test(appName?.substring(provider.length));

      if (afterProvider === "" || hasSeparator || hasUppercase) {
        return provider;
      }
    }
  }

  return null;
};

const getOAuthConfigForApp = (appName: string) => {
  const provider = extractProviderFromAppName(appName);
  return provider ? WELL_KNOWN_OAUTH_APPS[provider] : null;
};

interface OAuthStartParams {
  appName: string;
  returnUrl?: string | null;
  integrationId?: string | null;
  installId: string;
  instance: MCPInstance;
  envVars: Record<string, unknown>;
  invoke: MCPState["Variables"]["invoke"];
  isCustomBot?: boolean;
  sessionToken?: string;
  botName?: string;
}

// deno-lint-ignore no-explicit-any
export const startOAuth = async (params: OAuthStartParams): Promise<any> => {
  const {
    appName,
    installId,
    instance,
    returnUrl,
    envVars,
    integrationId,
    botName,
  } = params;

  const redirectUri = new URL(
    `/oauth/callback`,
    "https://mcp.deco.site",
  );

  const invokeApp = await findCompatibleApp(
    instance,
    OAUTH_START_LOADER,
  );

  if (!invokeApp) {
    const stateSchema = await schemaFromAppName(appName);
    if (stateSchema) {
      return {
        stateSchema,
      };
    }
    return null;
  }

  const oauthApp = getOAuthConfigForApp(appName);

  if (!oauthApp) {
    return null;
  }

  const clientId = envVars[oauthApp.clientIdKey];
  const scopes = oauthApp.scopes;

  const state = StateBuilder.build(
    appName,
    installId,
    invokeApp,
    returnUrl,
    redirectUri.href,
    integrationId,
    botName,
  );

  const oauthStartLoader = `${invokeApp}${OAUTH_START_LOADER}`;

  const props = {
    installId,
    appName,
    redirectUri,
    state,
    returnUrl,
    clientId,
    scopes,
    integrationId,
  };

  // deno-lint-ignore no-explicit-any
  return await params.invoke(oauthStartLoader, props as any);
};

export const withOAuth = (
  app: Hono<MCPState>,
) => {
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

  app.get("/oauth/start", async (c) => {
    const appName = c.var.appName;
    const installId = c.var.installId;
    const envVars = env(c);
    const url = new URL(c.req.url);
    const returnUrl = url.searchParams.get("returnUrl");
    const integrationId = url.searchParams.get("integrationId");

    const sessionToken = url.searchParams.get("sessionToken");
    const finalEnvVars = { ...envVars };

    if (sessionToken) {
      const credentials = retrieveCustomBotSession(sessionToken);
      if (!credentials) {
        return c.json({ error: "Invalid or expired session token" }, 400);
      }

      const oauthApp = getOAuthConfigForApp(appName);
      if (oauthApp) {
        finalEnvVars[oauthApp.clientIdKey] = credentials.clientId;
        finalEnvVars[oauthApp.clientSecretKey] = credentials.clientSecret;
      }

      try {
        const result = await startOAuth({
          returnUrl,
          appName,
          installId,
          instance: c.var.instance,
          integrationId,
          envVars: finalEnvVars,
          invoke: c.var.invoke,
          isCustomBot: !!sessionToken,
          sessionToken,
          botName: credentials.botName,
        });

        return parseInvokeResponse(result, c) ??
          new Response(null, { status: 204 });
      } catch (error) {
        console.error("OAuth start error:", error);
        const errorMessage = error instanceof Error
          ? error.message
          : "Unknown error";
        return c.json(
          { error: "OAuth initialization failed: " + errorMessage },
          500,
        );
      }
    }

    try {
      const result = await startOAuth({
        returnUrl,
        appName,
        installId,
        instance: c.var.instance,
        integrationId,
        envVars: finalEnvVars,
        invoke: c.var.invoke,
        isCustomBot: false,
      });

      if (!result) {
        return c.json({ error: "App not found" }, 404);
      }

      return parseInvokeResponse(result, c) ??
        new Response(null, { status: 204 });
    } catch (error) {
      console.error("OAuth start error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      return c.json(
        { error: "OAuth initialization failed: " + errorMessage },
        500,
      );
    }
  });
  app.get("/oauth/callback", async (c) => {
    const state = c.req.query("state");

    if (!state) {
      return c.json({ error: "State is required" }, 400);
    }

    try {
      const parsedState = StateBuilder.parse(state);
      const {
        appName,
        installId,
        invokeApp,
        returnUrl,
        redirectUri,
        integrationId,
      } = parsedState;

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
        integrationId?: string | null;
        clientId: string;
        clientSecret: string;
        customBotName?: string;
        queryParams?: Record<string, string | boolean | undefined>;
      }

      let clientId = envVars[oauthApp.clientIdKey] as string;
      let clientSecret = envVars[oauthApp.clientSecretKey] as string;
      let customBotName: string | undefined;

      const customBotState = parsedState as unknown as CustomBotState;
      if (customBotState.sessionToken && customBotState.isCustomBot) {
        const credentials = retrieveCustomBotSession(
          customBotState.sessionToken,
        );
        if (credentials) {
          clientId = credentials.clientId;
          clientSecret = credentials.clientSecret;
          customBotName = credentials.botName;
          invalidateSession(customBotState.sessionToken);
        }
      }

      const oauthCallbackAction = `${invokeApp}${OAUTH_CALLBACK_ACTION}`;
      const props: OAuthCallbackProps = {
        installId,
        appName,
        code: c.req.query("code"),
        state,
        returnUrl,
        redirectUri,
        integrationId,
        clientId,
        clientSecret,
        customBotName,
        queryParams: {
          savePermission: c.req.query("savePermission") === "true"
            ? true
            : false,
          continue: c.req.query("continue") === "true" ? true : false,
          permissions: c.req.query("permissions") ?? undefined,
        },
      };

      const response = await invoke(oauthCallbackAction, props, c);
      const isHtml = response?.headers.get("content-type")?.includes(
        "text/html",
      );

      if (response && returnUrl && !isHtml) {
        const responseData = await response.json();

        const { installId: responseInstallId, name, account } = responseData;
        const thisUrl = new URL(c.req.url);
        thisUrl.protocol = "https:";
        if (thisUrl.hostname === "localhost") {
          thisUrl.protocol = "http:";
        }
        const url = new URL(returnUrl);
        url.searchParams.set("appName", appName);
        url.searchParams.set("installId", responseInstallId);
        integrationId && url.searchParams.set("integrationId", integrationId);
        url.searchParams.set(
          "mcpUrl",
          new URL(
            `/apps/${appName}/${responseInstallId}/mcp/messages`,
            thisUrl.origin,
          )
            .href,
        );
        name && url.searchParams.set("name", name);
        account && url.searchParams.set("account", account);

        return c.redirect(url.toString());
      }

      if (!response) {
        return c.html(
          "<html><body>Success! You may close this window.</body></html>",
        );
      }

      return response;
    } catch (error) {
      console.error("OAuth callback state parsing error:", error);
      return c.json({ error: "Invalid state parameter" }, 400);
    }
  });
};
