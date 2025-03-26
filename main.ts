import { Hono } from "@hono/hono";
import { decoInstance, MCP_REGISTRY, MCP_SERVER } from "site/registry.ts";

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
  return ctx.res = await instance.server(ctx, next);
});

app.use("/*", MCP_SERVER);

app.use("/*", async (ctx) => ctx.res = await MCP_REGISTRY!.fetch(ctx.req.raw));

Deno.serve({ handler: app.fetch, port: envPort ? +envPort : 8000 });
