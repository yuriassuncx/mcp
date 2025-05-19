// deno-lint-ignore-file no-explicit-any
import { buildImportMap, Deco, DecoOptions } from "@deco/deco";
import { fromJSON } from "@deco/deco/engine";
import { bindings as HTMX } from "@deco/deco/htmx";
import { mcpServer } from "@deco/mcp";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { walk } from "jsr:@std/fs";
import { basename, relative } from "jsr:@std/path";
import { LRUCache } from "lru-cache";
import { Layout } from "./_app.tsx";
import { installStorage } from "./apps/site.ts";
import manifest, { Manifest } from "./manifest.gen.ts";
import { middlewaresFor } from "./middleware.ts";

const flags = parseArgs(Deno.args, {
  string: ["apps", "static-root"],
});

const isExportDefaultClass = (value: unknown | { default: unknown }) => {
  return typeof value === "object" && value && "default" in value &&
    value.default?.toString().substring(0, 5) === "class";
};
let importMap: ReturnType<typeof buildImportMap> | undefined = undefined;

const registerAppModule = async (
  appTsName: string,
  appFile: string,
) => {
  const appMod = await import(appFile);
  if (isExportDefaultClass(appMod)) {
    importMap!.imports[appTsName] = appFile;
    // @ts-ignore: This is a hack to get the app module into the manifest
    manifest.apps[appTsName] = appMod;
  }
};

if (flags.apps) {
  importMap = buildImportMap(manifest);
  const appPaths = flags.apps.split(",");
  for (const appPath of appPaths) {
    const stat = await Deno.stat(appPath);
    if (stat.isDirectory) {
      for await (
        const entry of walk(appPath, {
          exts: [".ts", ".tsx"],
          includeDirs: false,
        })
      ) {
        const relPath = relative(appPath, entry.path);
        const appTsName = `site/apps/deco/${relPath}`;
        const appFile = `file://${entry.path}`;
        await registerAppModule(appTsName, appFile);
      }
    } else {
      const relPath = basename(appPath);
      const appTsName = `site/apps/deco/${relPath}`;
      const appFile = `file://${appPath}`;
      await registerAppModule(appTsName, appFile);
    }
  }
}

export interface MCPInstance {
  deco: Deco<Manifest>;
}

const contexts = new LRUCache<string, Promise<MCPInstance>>({
  max: 100,
  ttl: 1000 * 60 * 60,
  updateAgeOnGet: true,
});

const defaultInstallId = "default";

export interface MCPInstanceOptions {
  installId?: string | "default";
  appName?: string;
  bindings?: DecoOptions<Manifest>["bindings"];
}

const configure = manifest["actions"]["site/actions/mcps/configure.ts"].default;
export async function decoInstance(
  { installId, appName, bindings }: MCPInstanceOptions,
): Promise<MCPInstance | undefined> {
  let decofile: DecoOptions["decofile"] | undefined = undefined;

  const isDefault = installId === defaultInstallId;
  installId ??= crypto.randomUUID();
  let form = await installStorage.getItem(installId);
  if (form == null && !isDefault) {
    await configure({
      id: appName!,
      installId,
      props: {},
    });
    form = await installStorage.getItem(installId);
  }
  decofile = isDefault ? undefined : fromJSON(form as Record<string, unknown>);

  const basePath = appName && installId
    ? `/apps/${encodeURIComponent(appName)}/${installId}`
    : undefined;

  let instance = contexts.get(installId);
  if (!instance) {
    instance = Deco.init<Manifest>({
      manifest,
      importMap,
      decofile,
      bindings: {
        ...bindings ?? {},
        useServer: (deco, hono) => {
          hono.use("/*", async (c, next) => {
            const global = (c.var.global ?? {}) as Record<string, unknown>;
            global.installId = installId;
            global.appName = appName;
            global.configure = (props: Record<string, unknown>) =>
              configure({
                id: appName!,
                installId,
                props,
              });
            global.getConfiguration = () => {
              const { [installId]: config } = form as any ??
                {};
              const { __resolveType: _, ...props } = config ?? {};
              return props;
            };
            c.set("global", global);
            await next();
          });
          hono.use(
            "/*",
            mcpServer(
              deco,
              appName && installId
                ? {
                  middlewares: middlewaresFor({ appName, installId }),
                  basePath,
                }
                : {
                  include: [
                    "site/loaders/mcps/search.ts" as const,
                    "site/actions/mcps/configure.ts" as const,
                    "site/actions/mcps/check.ts" as const,
                  ],
                },
            ),
          ); // some type errors may occur
        },
      },
    }).then((deco) => ({
      deco,
    }));
    contexts.set(installId, instance);
  }

  return instance;
}

export const cleanInstance = (installId: string) => {
  contexts.delete(installId);
};

export const { deco: MCP_REGISTRY } = (await decoInstance({
  installId: defaultInstallId,
  bindings: HTMX<Manifest>({
    Layout,
    staticRoot: flags["static-root"],
  }),
}))!;
