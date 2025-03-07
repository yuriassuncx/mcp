import { context, Deco, JSONSchema7 } from "@deco/deco";
import { Hono } from "@hono/hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import manifest, { Manifest } from "./manifest.gen.ts";
import { SSEServerTransport } from "./sse.ts";

const mcp = new McpServer({
  name: `deco-site-mcp`,
  version: context.deploymentId ?? "unknown",
}, {
  capabilities: {
    tools: {},
  },
});
const deco = await Deco.init<Manifest>({
  manifest,
});
const meta = await deco.meta();
const schema = meta?.value.schema;

const idFromDefinition = (definition: string) => {
  // definition is #/definitions/c2l0ZS9hcHBzL3NpdGUudHM=
  const [_, __, id] = definition.split("/");
  return id;
};
const RESOLVABLE_DEFINITION = "#/definitions/Resolvable";
const registerTools = (schemas: typeof schema) => {
  if (!schemas) return;
  const loaders: JSONSchema7 = schemas.root.loaders ?? { anyOf: [] };
  const availableLoaders = "anyOf" in loaders
    ? loaders.anyOf as JSONSchema7[] ?? []
    : [];

  const tools = (availableLoaders ?? []).map((loader) => {
    if (!loader.$ref || loader.$ref === RESOLVABLE_DEFINITION) return;
    const loaderDef = schemas.definitions[idFromDefinition(loader.$ref)];
    const resolveType =
      (loaderDef.properties?.__resolveType as { default: string }).default;

    delete loaderDef.properties?.["__resolveType"];
    loaderDef.required = loaderDef.required?.filter((r) =>
      r !== "__resolveType"
    );
    const props = loaderDef.allOf ?? [];
    const singleProp = props[0];
    const ref = (singleProp as { $ref: string })?.$ref;
    const inputSchema = ref
      ? schemas.definitions[idFromDefinition(ref)]
      : undefined;
    return {
      name: resolveType,
      description: loaderDef.description,
      inputSchema: inputSchema && "type" in inputSchema ? inputSchema : {
        type: "object",
        properties: {},
      },
    };
  });
  const validTools = tools.filter((tool) => tool !== undefined);
  mcp.server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: validTools,
    };
  });
  mcp.server.setRequestHandler(CallToolRequestSchema, async (req) => {
    try {
      const state = await deco.prepareState(
        {
          req: {
            raw: new Request("http://localhost:8000"),
            param: () => ({}),
          },
        },
      );
      const result = await deco.invoke(
        req.params.name,
        req.params.arguments,
        undefined,
        state,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              result,
            ),
          },
        ],
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  });
};
registerTools(meta?.value.schema);
const app = new Hono();
const envPort = Deno.env.get("PORT");

// Store active SSE connections
const transports = new Map<string, SSEServerTransport>();

// Update your SSE endpoint
app.get("/sse", () => {
  const transport = new SSEServerTransport("/messages");
  transports.set(transport.sessionId, transport);

  // Set up cleanup when connection closes
  transport.onclose = () => {
    transports.delete(transport.sessionId);
  };

  // Create the SSE response first
  const response = transport.createSSEResponse();

  // Connect to MCP server after setting up the SSE connection
  mcp.server.connect(transport);

  return response;
});

// Add a route to handle incoming messages
app.post("/messages", async (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId) {
    return c.json({ error: "Missing sessionId" }, 400);
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    return c.json({ error: "Invalid session" }, 404);
  }

  return await transport.handlePostMessage(c.req.raw);
});

// Clean up transports when they're done
app.all("/*", async (c) => c.res = await deco.fetch(c.req.raw));
Deno.serve({ handler: app.fetch, port: envPort ? +envPort : 8000 });
