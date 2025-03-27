import { fromJSON } from "@deco/deco/engine";
import { Deco, DecoOptions } from "@deco/deco";
import { installStorage } from "site/apps/site.ts";
import manifest, { Manifest } from "site/manifest.gen.ts";
import { mcpServer } from "@deco/mcp";
import { LRUCache } from "lru-cache";

export interface MCPInstance {
  deco: Deco<Manifest>;
  server: ReturnType<typeof mcpServer<Manifest>>;
}

const contexts = new LRUCache<string, Promise<MCPInstance>>({
  max: 100,
  ttl: 1000 * 60 * 60,
  updateAgeOnGet: true,
});

export const decoInstance = async (
  installId?: string,
  appName?: string,
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
    }).then((deco) => ({
      deco,
      server: mcpServer<Manifest>(
        deco,
        appName && installId
          ? {
            basePath,
          }
          : undefined,
      ),
    }));
    contexts.set(installId, instance);
  }

  return instance;
};
export const { deco: MCP_REGISTRY, server: MCP_SERVER } =
  (await decoInstance())!;
