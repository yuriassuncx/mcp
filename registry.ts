import { fromJSON } from "@deco/deco/engine";
import { Deco, DecoOptions } from "@deco/deco";
import { installStorage } from "site/apps/site.ts";
import manifest, { Manifest } from "site/manifest.gen.ts";
import { mcpServer } from "@deco/mcp";
import { LRUCache } from "lru-cache";
import { bindings as HTMX } from "@deco/deco/htmx";
import { Layout } from "./_app.tsx";
import { middlewaresFor } from "site/middleware.ts";

export interface MCPInstance {
  deco: Deco<Manifest>;
  server: ReturnType<typeof mcpServer<Manifest>>;
}

const contexts = new LRUCache<string, Promise<MCPInstance>>({
  max: 100,
  ttl: 1000 * 60 * 60,
  updateAgeOnGet: true,
});

export interface MCPInstanceOptions {
  bindings?: ReturnType<typeof HTMX<Manifest>>;
  installId?: string;
  appName?: string;
}

export const decoInstance = async (
  { installId, appName, bindings }: MCPInstanceOptions,
): Promise<MCPInstance | undefined> => {
  let decofile: DecoOptions["decofile"] | undefined = undefined;

  if (!installId) {
    installId = "default";
  } else {
    const form = await installStorage.getItem(installId);
    if (!form) {
      return undefined;
    }
    decofile = fromJSON(form as Record<string, unknown>);
  }

  const basePath = appName && installId
    ? `/apps/${appName}/${installId}`
    : undefined;

  let instance = contexts.get(installId);
  if (!instance) {
    instance = Deco.init<Manifest>({
      manifest,
      decofile,
      bindings,
    }).then((deco) => ({
      deco,
      server: mcpServer<Manifest>(
        deco,
        appName && installId
          ? {
            middlewares: middlewaresFor({ appName, installId }),
            basePath,
          }
          : {
            include: [
              "site/loaders/mcps/get.ts",
              "site/loaders/mcps/search.ts",
              "site/actions/mcps/configure.ts",
              "site/actions/mcps/check.ts",
            ],
          },
      ),
    }));
    contexts.set(installId, instance);
  }

  return instance;
};

export const cleanInstance = (installId: string) => {
  contexts.delete(installId);
};

export const { deco: MCP_REGISTRY, server: MCP_SERVER } = (await decoInstance({
  bindings: HTMX({ Layout }),
}))!;
