import { Secret } from "apps/website/loaders/secret.ts";
import { AppContext } from "../apps/site.ts";

export default function clientSecret(
  { app }: { app: string },
  _req: Request,
  ctx: AppContext,
): Secret | string {
  return ctx.oauthClientIds[app];
}
