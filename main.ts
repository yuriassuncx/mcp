// deno-lint-ignore-file no-explicit-any
import { Deco } from '@deco/deco';
import { fromEndpoint } from "@deco/deco/engine";
import { mcpServer } from "@deco/mcp";
import { Hono } from "@hono/hono";
import manifest from "./manifest.gen.ts";

const app = new Hono();
const envPort = Deno.env.get("PORT");

const contexts: Record<string, Promise<Deco>> = {};

const decoInstance = (url: string): Promise<Deco> => {
  let mcpId = new URL(url).searchParams.get("install");
  if (!mcpId) {
    mcpId = "default"
  }
  contexts[mcpId] ??= Deco.init<any>({
    manifest,
    decofile: URL.canParse(mcpId) ? fromEndpoint(mcpId) : undefined,
  });

  return contexts[mcpId];
}

app.use("/*", async (ctx, next) => {
  const instance = await decoInstance(ctx.req.url);
  await mcpServer(instance as any)(ctx, next);
});

app.all("/*", async (c) => {
  const instance = await decoInstance(c.req.url);
  c.res = await instance.fetch(c.req.raw);
});

Deno.serve({ handler: app.fetch, port: envPort ? +envPort : 8000 });
