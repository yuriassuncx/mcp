// deno-lint-ignore-file no-explicit-any
import { Context } from "@deco/deco";
import { getTools } from "@deco/mcp";
import { Context as HonoContext, Hono } from "@hono/hono";
import { MCPInstance, MCPState } from "./registry.ts";
import { env } from "@hono/hono/adapter";

const OAUTH_START_LOADER = "/loaders/oauth/start.ts";
const OAUTH_CALLBACK_ACTION = "/actions/oauth/callback.ts";

const findOAuthCompatibleApp = async (
  instance: MCPInstance,
) => {
  const names = new Map<string, string>();
  const run = Context.bind(instance.deco.ctx, async () => {
    return await instance.deco.meta();
  });
  const schemas = await run();

  const tools = getTools(
    names,
    schemas?.value.schema,
    { blocks: ["loaders"] },
    schemas?.value?.manifest?.blocks?.apps,
  );

  const loader = tools.find((t) =>
    t.resolveType.endsWith(OAUTH_START_LOADER)
  ) as
    | { resolveType: string }
    | undefined;

  return loader
    ? loader.resolveType.substring(
      0,
      loader.resolveType.length - OAUTH_START_LOADER.length,
    )
    : undefined;
};

export const StateBuilder = {
  build: (
    appName: string,
    installId: string,
    invokeApp: string,
    returnUrl?: string | null,
  ) => {
    return encodeURIComponent(btoa(JSON.stringify({
      appName,
      installId,
      invokeApp,
      returnUrl,
    })));
  },
  parse: (state: string): {
    appName: string;
    installId: string;
    invokeApp: string;
    returnUrl?: string | null;
  } => {
    const decoded = atob(decodeURIComponent(state));
    return JSON.parse(decoded);
  },
};

const invoke = async (
  key: string,
  props: any,
  c: HonoContext<MCPState>,
): Promise<Response | null> => {
  const response: unknown = await c.var.invoke(key, props);
  if (response instanceof Response) {
    return response;
  }

  if (typeof response === "string") {
    return c.text(response);
  }

  if (typeof response === "object") {
    return c.json(response);
  }

  return null;
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
};

const extractProviderFromAppName = (appName: string): string | null => {
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
  const provider = extractProviderFromAppName(appName);
  return provider ? WELL_KNOWN_OAUTH_APPS[provider] : null;
};

export const withOAuth = (
  app: Hono<
    MCPState
  >,
) => {
  app.get("/oauth/start", async (c) => {
    const appName = c.var.appName;
    const installId = c.var.installId;

    const reqUrl = new URL(c.req.url);
    const redirectUri = new URL(
      `/oauth/callback`,
      c.req.url,
    );

    redirectUri.protocol = "https:";

    const returnUrl = reqUrl.searchParams.get("returnUrl");
    const invokeApp = await findOAuthCompatibleApp(
      c.var.instance,
    );
    if (!invokeApp) {
      return c.json({ error: "App not found" }, 404);
    }

    const envVars = env(c);
    const oauthApp = getOAuthConfigForApp(appName);

    if (!oauthApp) {
      return c.json({ error: `App ${appName} not supported` }, 404);
    }

    const clientId = envVars[oauthApp.clientIdKey];
    const scopes = oauthApp.scopes;

    const state = StateBuilder.build(appName, installId, invokeApp, returnUrl);
    const oauthStartLoader = `${invokeApp}${OAUTH_START_LOADER}`;
    const props = {
      installId,
      appName,
      redirectUri,
      state,
      returnUrl,
      clientId,
      scopes,
    };

    return await invoke(oauthStartLoader, props, c) ??
      new Response(null, { status: 204 });
  });
  app.get("/oauth/callback", async (c) => {
    const state = c.req.query("state");
    if (!state) {
      return c.json({ error: "State is required" }, 400);
    }

    const { appName, installId, invokeApp, returnUrl } = StateBuilder.parse(
      state,
    );

    const envVars = env(c);

    const oauthApp = getOAuthConfigForApp(appName);

    if (!oauthApp) {
      return c.json({ error: `App ${appName} not found` }, 404);
    }

    const oauthCallbackAction = `${invokeApp}${OAUTH_CALLBACK_ACTION}`;
    const props = {
      installId,
      appName,
      code: c.req.query("code"),
      state,
      returnUrl,
      clientId: envVars[oauthApp.clientIdKey],
      clientSecret: envVars[oauthApp.clientSecretKey],
    };
    const response = await invoke(oauthCallbackAction, props, c);

    if (response && returnUrl) {
      const { installId } = await response.json();
      const thisUrl = new URL(c.req.url);
      thisUrl.protocol = "https:";
      if (thisUrl.hostname === "localhost") {
        thisUrl.protocol = "http:";
      }
      const url = new URL(returnUrl);
      url.searchParams.set(
        "mcpUrl",
        new URL(`/apps/${appName}/${installId}/mcp/messages`, thisUrl.origin)
          .href,
      );
      return c.redirect(url.toString());
    }

    if (!response) {
      return c.html(
        "<html><body>Success! You may close this window.</body></html>",
      );
    }
    return response;
  });
};
