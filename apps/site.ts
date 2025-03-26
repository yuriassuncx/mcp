import { type App, type AppContext as AC } from "@deco/deco";
import manifest, { Manifest } from "../manifest.gen.ts";

// deno-lint-ignore no-empty-interface
interface Props {}

/**
 * @title Site
 * @description Start your site from a template or from scratch.
 * @category Tool
 * @logo https://ozksgdmyrqcxcwhnbepg.supabase.co/storage/v1/object/public/assets/1/0ac02239-61e6-4289-8a36-e78c0975bcc8
 */
export default function Site(state: Props): App<Manifest, Props> {
  return {
    state,
    manifest,
    dependencies: [],
  };
}
export type SiteApp = ReturnType<typeof Site>;
export type AppContext = AC<SiteApp>;
