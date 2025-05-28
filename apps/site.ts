import { type App, type AppContext as AC } from "@deco/deco";
import { default as website, Props as WebsiteProps } from "apps/website/mod.ts";
import manifest, { Manifest } from "../manifest.gen.ts";
import { cleanInstance } from "../registry.ts";

export interface Storage {
  getItem<T = unknown>(key: string): Promise<T | null>;
  setItem<T = unknown>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface State {
  installStorage: Storage;
}
const kv = await Deno.openKv();

export const installStorage: Storage = {
  async getItem<T>(key: string) {
    const result = await kv.get<T>(["storage", key]);
    return result.value;
  },
  async setItem<T>(key: string, value: T) {
    await kv.set(["storage", key], value);
    cleanInstance(key);

    return Promise.resolve();
  },
  async removeItem(key: string) {
    await kv.delete(["storage", key]);
    cleanInstance(key);

    return Promise.resolve();
  },
};

export const appStorage: (appName: string) => Storage = (appName) => ({
  async getItem<T>(key: string) {
    const result = await kv.get<T>(["appstorage", appName, key]);
    return result.value;
  },
  async setItem<T>(key: string, value: T) {
    await kv.set(["appstorage", appName, key], value);
    cleanInstance(key);

    return Promise.resolve();
  },
  async removeItem(key: string) {
    await kv.delete(["appstorage", appName, key]);
    cleanInstance(key);

    return Promise.resolve();
  },
});
/**
 * @name main
 * @internal true
 * @title Site
 * @description Start your site from a template or from scratch.
 * @category Tool
 * @logo https://ozksgdmyrqcxcwhnbepg.supabase.co/storage/v1/object/public/assets/1/0ac02239-61e6-4289-8a36-e78c0975bcc8
 */
export default function Site(props: WebsiteProps): App<Manifest, State> {
  return {
    state: { installStorage },
    manifest,
    dependencies: [website(props)],
  };
}
export type SiteApp = ReturnType<typeof Site>;
export type AppContext = AC<SiteApp>;
