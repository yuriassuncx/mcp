import { join } from "jsr:@std/path/posix";
import { connect } from "jsr:@deco/warp";
import * as colors from "jsr:@std/fmt/colors";

export interface TunnelRegisterOptions {
  env: string;
  site: string;
  port: string;
  decoHost?: boolean;
}

const VERBOSE = Deno.env.get("VERBOSE");

export async function register(
  { env, site, port, decoHost }: TunnelRegisterOptions,
) {
  const decoHostDomain = `${env}--${site}.deco.host`;
  const { server, domain } = decoHost
    ? {
      server: `wss://${decoHostDomain}`,
      domain: decoHostDomain,
    }
    : {
      server: "wss://simpletunnel.deco.site",
      domain: `${env}--${site}.deco.site`,
    };
  const localAddr = `http://localhost:${port}`;
  await connect({
    domain,
    localAddr,
    server,
    apiKey: Deno.env.get("DECO_TUNNEL_SERVER_TOKEN") ??
      "c309424a-2dc4-46fe-bfc7-a7c10df59477",
  }).then((r) => {
    r.registered.then(() => {
      const admin = new URL(
        `/sites/${site}/spaces/dashboard?env=${env}`,
        "https://admin.deco.cx",
      );

      console.log(
        `\ndeco.cx started environment ${colors.green(env)} for site ${
          colors.brightBlue(site)
        }\n   -> 🌐 ${colors.bold("Preview")}: ${
          colors.cyan(`https://${domain}`)
        }\n   -> ✏️ ${colors.bold("Admin")}: ${colors.cyan(admin.href)}\n`,
      );
    });
    return r.closed.then(async (err) => {
      console.log(
        "tunnel connection error retrying in 500ms...",
        VERBOSE ? err : "",
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      return register({ env, site, port });
    });
  }).catch(async (err) => {
    console.log(
      "tunnel connection error retrying in 500ms...",
      VERBOSE ? err : "",
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    return register({ env, site, port });
  });
}

const dirname = import.meta.url.split("/").slice(0, -1).join("/");
const denoJSONURL = import.meta.resolve(dirname + "/deno.json");
const dotEnvURL = import.meta.resolve(dirname + "/.env");
const denoJSON = await fetch(denoJSONURL).then((res) => res.text());
const dotEnv = await fetch(dotEnvURL).then((res) => res.text());

const temp = await Deno.makeTempDir();
const denoJSONPath = join(temp, "deno.json");
await Deno.writeTextFile(denoJSONPath, denoJSON);
await Deno.writeTextFile(join(temp, ".env"), dotEnv);

const MAIN = join(dirname, "main.ts");
const dotEnvPath = join(temp, ".env");

const cmd = new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    `--env-file=${dotEnvPath}`,
    "--config",
    denoJSONPath,
    "-A",
    MAIN,
    ...Deno.args,
  ],
});

cmd.spawn();

const port = Number(Deno.env.get("APP_PORT")) || 8000;

const LOCAL_STORAGE_ENV_NAME = "deco_host_env_name";
const stableEnvironmentName = () => {
  const savedEnvironment = localStorage.getItem(LOCAL_STORAGE_ENV_NAME);
  if (savedEnvironment) {
    return savedEnvironment;
  }

  const newEnvironment = `${crypto.randomUUID().slice(0, 6)}-localhost`;
  localStorage.setItem(LOCAL_STORAGE_ENV_NAME, newEnvironment);
  return newEnvironment;
};

await register({
  env: Deno.env.get("DECO_ENV_NAME") || stableEnvironmentName(),
  site: "mcp",
  port: `${port}`,
});
await cmd.output();
