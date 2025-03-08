import { Deco } from "@deco/deco";
import { Hono } from "@hono/hono";
import manifest, { Manifest } from "./manifest.gen.ts";
import { mcpServer } from "./mcp/server.ts";

const app = new Hono();
const deco = await Deco.init<Manifest>({ manifest });
const envPort = Deno.env.get("PORT");

app.use("/*", mcpServer(deco));
app.all("/*", async (c) => c.res = await deco.fetch(c.req.raw));

Deno.serve({ handler: app.fetch, port: envPort ? +envPort : 8000 });
