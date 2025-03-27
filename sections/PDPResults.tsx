import { InstallURL } from "site/actions/mcps/configure.ts";
import { AppContext } from "../apps/site.ts";

export interface Props {
  name: string;
}

export const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
) => {
  const form = await req.formData();
  const formProps = Object.fromEntries(form.entries());

  const installURL = await ctx.invoke.site.actions.mcps.configure({
    name: props.name,
    props: formProps,
  });

  return { ...props, installURL };
};

export default function PDPResults({ installURL }: { installURL: InstallURL }) {
  if (installURL?.success) {
    return (
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4">
        <h2 class="text-xl font-bold mb-2">Installation Successful!</h2>
        <p class="mb-4">Your MCP URL:</p>
        <code class="block bg-green-50 p-4 rounded">{installURL.url}</code>
      </div>
    );
  }

  return (
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
      Installation failed. Please try again.
    </div>
  );
}
