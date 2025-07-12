import { Context } from "@deco/deco";
import { Hono } from "@hono/hono";
import { StateBuilder } from "./oauth.ts";
import { decoInstance, MCP_REGISTRY } from "./registry.ts";

const app = new Hono();
const envPort = Deno.env.get("PORT");

const APPS_INSTALL_URL = new URLPattern({
  pathname: "/apps/:appName/:installId/*",
});

const getInstallIdFromAuthorizationHeader = (req: Request) => {
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return undefined;
  }
  const [_, installId] = authorization.split(" ");
  return installId || undefined;
};

app.use("/*", async (ctx) => {
  const url = new URL(ctx.req.url);
  const match = APPS_INSTALL_URL.exec({ pathname: url.pathname });

  const fromHeader = getInstallIdFromAuthorizationHeader(ctx.req.raw);
  let installId = fromHeader ?? url.searchParams.get("installId") ??
    match?.pathname?.groups?.installId;

  let appName = url.searchParams.get("appName") ??
    match?.pathname?.groups?.appName;

  // setInstallId to random if appName is specified
  if (appName && !installId) {
    installId = crypto.randomUUID();
  }

  // fromOAuthParams
  const state = url.searchParams.get("state");
  if (!appName && !installId && state) {
    const parsed = StateBuilder.parse(state);
    appName = parsed.appName;
    installId = parsed.installId;
  }

  if (appName) {
    const decodedAppName = decodeURIComponent(appName);

    const instance = await decoInstance({
      installId,
      appName: decodedAppName,
      isInstallIdFromHeader: !!fromHeader,
    });
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
