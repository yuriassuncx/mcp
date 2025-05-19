import { Context } from "@deco/deco";
import { Hono } from "@hono/hono";
import { decoInstance, MCP_REGISTRY } from "./registry.ts";

const app = new Hono();
const envPort = Deno.env.get("PORT");

const APPS_INSTALL_URL = new URLPattern({
  pathname: "/apps/:appName/:installId/*",
});

// @mcandeia this is temporary until we have a better way to handle this
const OAUTH_SUPPORTED_APPS: Record<string, string> = {
  "Slack": "slack",
};
const StateBuilder = {
  build: (appName: string, installId: string, returnUrl?: string | null) => {
    return encodeURIComponent(btoa(JSON.stringify({
      appName,
      installId,
      returnUrl,
    })));
  },
  parse: (state: string): {
    appName: string;
    installId: string;
    returnUrl?: string | null;
  } => {
    const decoded = atob(decodeURIComponent(state));
    return JSON.parse(decoded);
  },
};
app.get("/oauth/start/:appName", (c) => {
  const appName = c.req.param("appName");
  const installId = crypto.randomUUID();

  const reqUrl = new URL(c.req.url);
  const redirectUri = new URL(
    `/oauth/callback`,
    c.req.url,
  );

  const returnUrl = reqUrl.searchParams.get("returnUrl");
  const state = StateBuilder.build(appName, installId, returnUrl);
  redirectUri.set("state", state);
  const url = new URL(
    `/live/invoke/${
      OAUTH_SUPPORTED_APPS[appName]
    }/loaders/oauth/start.ts?installId=${installId}&appName=${appName}&redirectUri=${redirectUri}`,
    c.req.url,
  );
  returnUrl && url.searchParams.set("returnUrl", returnUrl);

  return Response.redirect(
    url,
  );
});
app.get("/oauth/callback", (c) => {
  const state = c.req.query("state");
  if (!state) {
    return c.res.json({ error: "State is required" }, 400);
  }

  const { appName, installId, returnUrl } = StateBuilder.parse(state);

  const url = new URL(
    `/live/invoke/${
      OAUTH_SUPPORTED_APPS[appName]
    }/actions/oauth/callback.ts?installId=${installId}&appName=${appName}&code=${
      c.req.query("code")
    }&state=${state}`,
    c.req.url,
  );
  if (returnUrl) {
    url.searchParams.set("returnUrl", returnUrl);
  }
  return Response.redirect(
    url,
  );
});

app.use("/*", async (ctx) => {
  const url = new URL(ctx.req.url);
  const match = APPS_INSTALL_URL.exec({ pathname: url.pathname });

  const installId = url.searchParams.get("installId") ??
    match?.pathname?.groups?.installId;
  const appName = url.searchParams.get("appName") ??
    match?.pathname?.groups?.appName;

  if (appName) {
    const decodedAppName = decodeURIComponent(appName);

    const instance = await decoInstance({ installId, appName: decodedAppName });
    if (!instance) {
      return ctx.res = await ctx.notFound();
    }
    const run = Context.bind(instance.deco.ctx, async () => {
      return await instance.deco.fetch(ctx.req.raw);
    });
    return run();
  }
  const run = Context.bind(MCP_REGISTRY.ctx, async () => {
    return await MCP_REGISTRY.fetch(ctx.req.raw);
  });
  return run();
});

Deno.serve({ handler: app.fetch, port: envPort ? +envPort : 8000 });
