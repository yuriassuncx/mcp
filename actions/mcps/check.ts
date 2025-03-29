import { installStorage } from "../../apps/site.ts";
import { Validator } from "jsonschema";
import { default as listMCPs } from "../../loaders/mcps/list.ts";

export interface Props {
  /**
   * @description ID of the install, its optional, if passed, will update the existing install
   */
  installId: string;
}

export interface CheckResult {
  /**
   * @description The errors found in the configuration
   */
  errors: string[];
  /**
   * @description Whether the installation was successful
   */
  success: boolean;
}
/**
 * @name CHECK_MCP_CONFIGURATION
 * @description Check the configuration of an MCP if any error occurs so CONFIGURE_MCP should be used
 */
export default async function checkConfiguration(
  props: Props,
): Promise<CheckResult> {
  const installId = props.installId;
  if (!installId) {
    return {
      success: false,
      errors: ["Install ID is required"],
    };
  }

  // deno-lint-ignore no-explicit-any
  const config = await installStorage.getItem<Record<string, any>>(installId);
  if (!config) {
    return { success: false, errors: ["Install not found"] };
  }
  const name = Object.keys(config)[0];
  const schema = await listMCPs().then((list) =>
    list.find((t) => t.name === name)?.inputSchema
  );
  if (!schema) {
    return { success: false, errors: ["MCP not found"] };
  }
  const v = new Validator();
  const { __resolveType: _, ...configData } = config[name];
  const result = v.validate(configData, schema);
  return {
    success: result.valid,
    errors: result.errors.map((e) => e.message),
  };
}
