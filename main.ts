import { Deco } from "@deco/deco";
import { mcpServer } from "@deco/mcp";
import { Hono } from "@hono/hono";
import manifest, { Manifest } from "./manifest.gen.ts";

const app = new Hono();
const deco = await Deco.init<Manifest>({
  manifest,
});
const envPort = Deno.env.get("PORT");

app.use("/*", mcpServer(deco));
app.all("/*", async (c) => c.res = await deco.fetch(c.req.raw));

Deno.serve({ handler: app.fetch, port: envPort ? +envPort : 8000 });
