import { Context, Hono } from "@hono/hono";
import { MCPState } from "./registry.ts";
import { findCompatibleApp, invoke } from "./utils.ts";

const BINDING_INVOKE_ACTION = "/actions/channels/invoke.ts";

const onChannelHooked = async (c: Context<MCPState>) => {
  const invokeApp = await findCompatibleApp(
    c.var.instance,
    BINDING_INVOKE_ACTION,
  );

  if (!invokeApp) {
    return c.json({ error: "App not found" }, 404);
  }

  const invokeBindingAction = `${invokeApp}${BINDING_INVOKE_ACTION}`;

  let parsedBody: unknown;
  if (c.req.header("content-type")?.includes("application/json")) {
    parsedBody = await c.req.json().catch(() => null);
  } else {
    parsedBody = await c.req.text().catch(() => null);
  }

  return await invoke(invokeBindingAction, parsedBody, c) ??
    new Response(null, { status: 204 });
};
export const withChannelHooks = (
  app: Hono<
    MCPState
  >,
) => {
  app.post("/bindings/hooks", onChannelHooked);
  app.post("/channels/hooks", onChannelHooked);
};
