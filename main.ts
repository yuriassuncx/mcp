import { Hono } from "@hono/hono";
import { decoInstance, MCP_REGISTRY, MCP_SERVER } from "site/registry.ts";
import { Context } from "@deco/deco";

const app = new Hono();
const envPort = Deno.env.get("PORT");

app.use("/apps/:appName/:installId/*", async (ctx, next) => {
  const instance = await decoInstance(
    ctx.req.param("installId"),
    ctx.req.param("appName"),
  );
  if (!instance) {
    return ctx.notFound();
  }
  const run = Context.bind(instance.deco.ctx, async () => {
    return await instance.server(ctx, next);
  });
  return run();
});

app.use("/*", (ctx, next) => {
  const run = Context.bind(MCP_REGISTRY!.ctx, async () => {
    return await MCP_SERVER!(ctx, next);
  });
  return run();
});

Deno.serve({ handler: app.fetch, port: envPort ? +envPort : 8000 });
