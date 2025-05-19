// deno-lint-ignore-file no-explicit-any
import { Context } from "@deco/deco";
import { Hono } from "@hono/hono";
import { decoInstance, manifest, MCP_REGISTRY } from "./registry.ts";
import type { MCP } from "./loaders/mcps/search.ts";
const app = new Hono();
const envPort = Deno.env.get("PORT");

const APPS_INSTALL_URL = new URLPattern({
  pathname: "/apps/:appName/:installId/*",
});

const getMCP = manifest["loaders"]["site/loaders/mcps/get.ts"];
const configureMCP = manifest["actions"]["site/actions/mcps/configure.ts"];

app.get("/oauth-start/:appName", async (ctx) => {
  const url = new URL(ctx.req.url);
  const appName = ctx.req.param("appName");
  if (!appName) {
    return ctx.res = await ctx.notFound();
  }
  const integration: MCP | undefined = await getMCP.default({ id: appName });
  console.log({ integration });

  const decodedAppName = decodeURIComponent(appName);
  let id = url.searchParams.get("installId");
  if (!id) {
    id = crypto.randomUUID();
    await configureMCP.default({
      id: appName,
      props: {},
      installId: id,
    });
  }
  const instance = await decoInstance({
    installId: id,
    appName: decodedAppName,
  });
  if (!instance) {
    return ctx.res = await ctx.notFound();
  }

  const run = Context.bind(instance.deco.ctx, async () => {
    const state = await instance.deco.prepareState({
      req: {
        raw: ctx.req.raw,
        param: () => ctx.req.param(),
      },
    });
    return await instance.deco.invoke(
      `${appName.toLowerCase()}/loaders/oauth/uri.ts` as any,
      // MISSING CLIENT_ID
      {
        redirectUri: `https://mcp.deco.site/oauth-callback/${appName}/${id}`,
      } as any,
      [],
      state,
    ) as { authorizationUri: string };
  });
  const response = await run() as { authorizationUri: string };
  console.log({ response });

  return "authorizationUri" in response
    ? Response.redirect(response.authorizationUri)
    : ctx.res = new Response("missing authorizationUri", { status: 400 });
});
app.get("/oauth-callback/:appName/:installId", async (ctx) => {
  const url = new URL(ctx.req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return ctx.res = new Response("missing code", { status: 400 });
  }
  const installId = ctx.req.param("installId");
  const appName = ctx.req.param("appName");
  if (!installId || !appName) {
    return ctx.res = await ctx.notFound();
  }
  const decodedAppName = decodeURIComponent(appName);
  const instance = await decoInstance({ installId, appName: decodedAppName });
  if (!instance) {
    return ctx.res = await ctx.notFound();
  }

  const state = await instance.deco.prepareState({
    req: {
      raw: ctx.req.raw,
      param: () => ctx.req.param(),
    },
  });

  const secret = await MCP_REGISTRY.invoke(
    `site/loaders/clientSecret.ts` as `#${string}`,
    { app: appName } as any,
    [],
    state,
  );
  const clientSecret = typeof secret === "string"
    ? secret
    : (secret as unknown as { get?: () => string })?.get?.();
  const response = await instance.deco.invoke(
    `${appName}/actions/oauth/callback.ts` as any,
    {
      code,
      clientSecret,
    } as any,
    [],
    state,
  ) as { returnUrl: string; authorizationCode: string };

  await configureMCP.default({
    id: appName,
    installId,
    props: response,
  });

  return "returnUrl" in response
    ? Response.redirect(response.returnUrl)
    : ctx.res = new Response(null, { status: 204 });
});

app.use("/*", async (ctx) => {
  const url = new URL(ctx.req.url);
  const match = APPS_INSTALL_URL.exec({ pathname: url.pathname });

  const installId = url.searchParams.get("installId") ??
    match?.pathname?.groups?.installId;
  const appName = url.searchParams.get("appName") ??
    match?.pathname?.groups?.appName;

  if (installId && appName) {
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
