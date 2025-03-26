// deno-lint-ignore-file no-empty-interface
import { type App, type AppContext as AC } from "@deco/deco";
import manifest, { Manifest } from "../manifest.gen.ts";

export interface Storage {
  getItem<T = unknown>(key: string): Promise<T | null>;
  setItem<T = unknown>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface State {
  installStorage: Storage;
}
export interface Props { }
export const installStorage: Storage = {
  async getItem<T>(key: string) {
    const kv = await Deno.openKv();
    const result = await kv.get<T>(['storage', key]);
    await kv.close();
    return result.value;
  },
  async setItem<T>(key: string, value: T) {
    const kv = await Deno.openKv();
    await kv.set(['storage', key], value);
    await kv.close();
    return Promise.resolve();
  },
  async removeItem(key: string) {
    const kv = await Deno.openKv();
    await kv.delete(['storage', key]);
    await kv.close();
    return Promise.resolve();
  },
};
/**
 * @name main
 * @title Site
 * @description Start your site from a template or from scratch.
 * @category Tool
 * @logo https://ozksgdmyrqcxcwhnbepg.supabase.co/storage/v1/object/public/assets/1/0ac02239-61e6-4289-8a36-e78c0975bcc8
 */
export default function Site(_state: Props): App<Manifest, State> {
  return {
    state: {
      installStorage,
    },
    manifest,
    dependencies: [],
  };
}
export type SiteApp = ReturnType<typeof Site>;
export type AppContext = AC<SiteApp>;
