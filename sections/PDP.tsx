import { InstallURL } from "../actions/mcps/configure.ts";
import { AppContext } from "../apps/site.ts";
import { MCP } from "../loaders/mcps/list.ts";
import { useId } from "site/sdk/useId.ts";

export interface Props {
  name?: string;
  mcp?: MCP;
  installURL?: InstallURL;
  error?: string;
}

export const loader = async (
  props: Props,
  req: Request,
  ctx: AppContext,
) => {
  const url = new URL(req.url);
  const name = url.pathname.split("/").pop() || props.name;

  if (!name) {
    return { ...props, error: "MCP name not provided" };
  }

  const mcps = await ctx.invoke.site.loaders.mcps.list();
  const mcp = mcps.find((m: MCP) => m.name === name);

  if (!mcp) {
    return { ...props, error: "MCP not found" };
  }

  return { ...props, name, mcp };
};

export const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
) => {
  try {
    const form = await req.formData();
    const formProps = Object.fromEntries(form.entries());
    const config = formProps.config;

    const installURL = await ctx.invoke.site.actions.mcps.configure({
      name: props.name!,
      // deno-lint-ignore no-explicit-any
      props: JSON.parse(config as any as string),
    });

    return { ...props, installURL };
  } catch (err) {
    return { ...props, error: err.message };
  }
};

export default function PDP({ mcp, error, installURL }: Props) {
  const slot = useId();
  if (error) {
    return (
      <div class="container mx-auto p-4">
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (installURL?.success) {
    return (
      <div class="container mx-auto p-4">
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <h2 class="text-xl font-bold mb-2">Installation Successful!</h2>
          <p class="mb-4">Your MCP URL:</p>
          <code class="block bg-green-50 p-4 rounded">{installURL.url}</code>
        </div>
      </div>
    );
  }

  if (!mcp) {
    return null;
  }

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const form = new FormData();
    const jsonInput = (e.target as HTMLFormElement).querySelector("textarea")
      ?.value;

    try {
      const parsedJson = JSON.parse(jsonInput || "{}");
      Object.entries(parsedJson).forEach(([key, value]) => {
        form.append(key, JSON.stringify(value));
      });

      const response = await fetch(globalThis.location.href, {
        method: "POST",
        body: form,
      });

      const result = await response.text();
      document.getElementById(slot)!.innerHTML = result;
    } catch (err) {
      alert("Invalid JSON format");
      console.error(err);
    }
  };

  return (
    <div class="container mx-auto p-4">
      <h1 class="text-4xl font-bold mb-8">{mcp.name}</h1>
      <p class="text-gray-600 mb-8">{mcp.description}</p>

      <div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 class="text-2xl font-bold mb-6">Configure Installation</h2>
        <form onSubmit={onSubmit} method="POST">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">
              Configuration JSON
            </label>
            <textarea
              name="config"
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows={10}
              placeholder='{
  "key1": "value1",
  "key2": {
    "nestedKey": "nestedValue"
  }
}'
            />
          </div>
          <button
            type="submit"
            class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            <span class="[.htmx-request_&]:hidden inline">Install</span>
            <span class="[.htmx-request_&]:inline hidden loading loading-spinner loading-sm" />
          </button>
        </form>

        <div id={slot} />
      </div>
    </div>
  );
}
