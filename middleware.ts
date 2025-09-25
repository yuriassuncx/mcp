// deno-lint-ignore-file no-explicit-any
import { CallToolMiddleware, ListToolsMiddleware, Tool } from "@deco/mcp";
import { startOAuth } from "./oauth.ts";
import { MCPInstance, MCPState } from "./registry.ts";

export interface MiddlewareOptions {
  appName: string;
  installId: string;
  instance: Promise<MCPInstance>;
}
const OAUTH_START_TOOL = "DECO_CHAT_OAUTH_START";

const OAUTH_TOOL: Tool = {
  name: OAUTH_START_TOOL,
  description: "Start the OAuth flow for the given app",
  inputSchema: {
    type: "object",
    properties: {
      appName: { type: "string" },
      installId: { type: "string" },
      returnUrl: { type: "string" },
      integrationId: { type: "string" },
    },
    required: [],
    additionalProperties: false,
  },
  resolveType: OAUTH_START_TOOL,
  outputSchema: {
    type: "object",
    properties: {
      redirectUrl: { type: "string" },
    },
    required: ["redirectUrl"],
    additionalProperties: true,
  },
};
export const middlewaresFor = (
  { appName, instance }: MiddlewareOptions,
): {
  listTools: ListToolsMiddleware[];
  callTool: CallToolMiddleware[];
} => {
  return {
    callTool: [
      async (req, next) => {
        if (req.params.name === OAUTH_START_TOOL) {
          const inst = await instance;
          const response = await startOAuth({
            integrationId: req.params.arguments?.integrationId as string | null,
            appName,
            installId: req.params.arguments?.installId as string ??
              crypto.randomUUID(),
            returnUrl: req.params.arguments?.returnUrl as string | null,
            instance: inst,
            envVars: Deno.env.toObject(),
            invoke: (async (name, args) => {
              const state = await inst.deco.prepareState({
                req: {
                  raw: new Request("https://localhost:8000"),
                  param: () => ({}),
                },
              });
              return await inst.deco.invoke(
                name as any,
                args,
                undefined,
                state,
              );
            }) as MCPState["Variables"]["invoke"],
          });
          let result: { redirectUrl: string | null } = {
            redirectUrl: null,
          };
          if (
            response && typeof response === "object" &&
            "stateSchema" in response && response.stateSchema
          ) {
            result = response;
          } else if (
            response && typeof response === "object" &&
            response instanceof Response
          ) {
            result = {
              redirectUrl: response.headers.get("Location"),
            };
          }
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result),
            }],
            structuredContent: result,
          };
        }
        return next!();
      },
    ],
    listTools: [async (_req, next) => {
      const { tools } = await next!();

      const hasOAuth = tools.some((tool) => tool.name === OAUTH_START_TOOL);

      return {
        tools: [...tools, ...(!hasOAuth ? [OAUTH_TOOL] : [])],
      };
    }],
  };
};
