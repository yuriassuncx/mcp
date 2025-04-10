import { join } from "jsr:@std/path/posix";

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

const runCmd = [
  Deno.execPath(),
  "run",
  `--env-file=${dotEnvPath}`,
  "--config",
  denoJSONPath,
  "-A",
  MAIN,
  ...Deno.args,
];
const cmd = new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    "-A",
    "--unstable-http",
    "--env",
    "https://deco.cx/run",
    "--",
    ...runCmd,
  ],
});

cmd.spawn();

await cmd.output();
