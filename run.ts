import { join } from "jsr:@std/path/posix";
import { connect } from "jsr:@deco/warp";
import * as colors from "jsr:@std/fmt/colors";

export interface TunnelRegisterOptions {
  env: string;
  site: string;
  port: string;
  decoHost?: boolean;
}

const SITE_NAME = "mcp";

const VERBOSE = Deno.env.get("VERBOSE");
const DECO_HOST_FOLDER = ".deco_host";
const STATIC_FOLDER = "static";

// Create .deco_host folder in current working directory
const decoHostPath = join(Deno.cwd(), DECO_HOST_FOLDER);
try {
  await Deno.mkdir(decoHostPath, { recursive: true });
} catch (e) {
  if (!(e instanceof Deno.errors.AlreadyExists)) {
    throw e;
  }
}

const STATIC_ROOT = join(decoHostPath, STATIC_FOLDER);

const REPO = `deco-sites/${SITE_NAME}`;
async function downloadStatic() {
  try {
    await Deno.mkdir(STATIC_ROOT, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) {
      throw e;
    }
    // If the directory exists and has contents, we can skip downloading
    const existing = [...Deno.readDirSync(STATIC_ROOT)];
    if (existing.length > 0) {
      return;
    }
  }

  const apiUrl =
    `https://api.github.com/repos/${REPO}/contents/${STATIC_FOLDER}`;
  const response = await fetch(apiUrl);
  const data = await response.json();

  await Promise.all(
    data.map(
      async (file: { type: string; download_url: string; name: string }) => {
        if (file.type === "file") {
          const filePath = join(STATIC_ROOT, file.name);
          const content = await fetch(file.download_url);
          await Deno.writeFile(filePath, await content.bytes());
        }
      },
    ),
  );
}

async function register(
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
const denoJSON = await fetch(denoJSONURL).then((res) => res.text());

const denoJSONPath = join(decoHostPath, "deno.json");
const downloadPromise = downloadStatic();
await Deno.writeTextFile(denoJSONPath, denoJSON);

const MAIN = join(dirname, "main.ts");

const args = Deno.args.length === 0
  ? [`--apps=${join(Deno.cwd(), "index.ts")}`]
  : Deno.args;
const SELF_DECO_HOST = `${SITE_NAME}.deco.site`;
const cmd = new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    "--config",
    denoJSONPath,
    "-A",
    MAIN,
    `--static-root=${STATIC_ROOT}`,
    ...args,
  ],
  env: {
    DECO_ALLOWED_AUTHORITIES: SELF_DECO_HOST,
    DECO_RELEASE: `https://${SELF_DECO_HOST}/.decofile`,
    STATIC_ROOT,
  },
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
  site: SITE_NAME,
  port: `${port}`,
  decoHost: true,
});
await downloadPromise;
await cmd.output();
