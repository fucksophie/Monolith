import { ConnInfo, serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { exists } from "./deps.ts";
import { Database } from "./libs/Database.ts";
import { ServerList } from "./libs/ServerList.ts";
import { login, changePassword, register } from "./routes/auth.ts";
import { skinRender, skinUpdate, whoami } from "./routes/extra.ts";
import { heartbeat, servers } from "./routes/heartbeat.ts";

export const serverList = new ServerList();
export const DB = new Database(); // only routes can get these two

async function handler(req: Request, conn: ConnInfo): Promise<Response> {
  const path = new URL(req.url);

  if (path.pathname == "/api/login") return login(req);
  // deno-fmt-ignore
  if (path.pathname == "/api/register" && req.method == "POST") return register(req);
  if (path.pathname == "/api/servers") return servers(req);
  if (path.pathname == "/api/whoami") return whoami(req);
  if (path.pathname == "/api/changePassword") return changePassword(req);

  if (path.pathname == "/heartbeat.jsp") return heartbeat(req, conn);

  // deno-fmt-ignore
  if (path.pathname == "/api/skinUpdate" && req.method == "POST") return skinUpdate(req);
  if (path.pathname.startsWith("/skin/")) return skinRender(req);

  // below is the HTTP server.

  if (path.pathname == "/") return passOn("index.html");
  const location = path.pathname.substring(1);

  if (await exists("website/" + location)) return await passOn(location);
  if (await exists("website/" + location + ".html")) {
    return await passOn(location + ".html");
  }

  return new Response("404 Not Found", { status: 404 });
}

async function passOn(location: string) {
  let contentType = "text/html";

  if (location.endsWith(".css")) contentType = "text/css";
  if (location.endsWith(".js")) contentType = "text/javascript";
  if (location.endsWith(".png")) contentType = "image/png";
  if (location.endsWith(".gif")) contentType = "image/gif";

  return new Response(await Deno.readFile("website/" + location), {
    headers: { "Content-Type": contentType },
  });
}

serve(handler, { port: 1928, hostname: "0.0.0.0" });
serve(handler, { port: 80, hostname: "0.0.0.0" });
