import { ConnInfo, serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { exists } from "./deps.ts";
import { Database } from "./libs/Database.ts";
import { ServerList } from "./libs/ServerList.ts";
import { login, register } from "./routes/auth.ts";
import { heartbeat, servers } from "./routes/heartbeat.ts";

export const serverList = new ServerList();
export const DB = new Database(); // only routes can get these two

async function handler(req: Request, conn: ConnInfo): Promise<Response> {
    const path = new URL(req.url);

    if(path.pathname == "/api/login") {
        return login(req);
    }
    if(path.pathname == "/api/register" && req.method == "POST") {
        return register(req)
    }
    if(path.pathname == "/heartbeat.jsp") {
        return heartbeat(req, conn);
    }
    if(path.pathname == "/api/servers") {
        return servers(req);
    }

    if(path.pathname == "/") {
        return new Response(Deno.readTextFileSync("website/index.html"), {headers:{"Content-Type":"text/html"}})
    }

    const location = path.pathname.substring(1);

    if(await exists("website/" + location)) return passOn(location)
    if(await exists("website/" + location+".html")) return passOn(location+".html")

    return new Response("404 Not Found", {status: 404})
}

function passOn(location: string) {
    let contentType = "text/html"

    if(location.endsWith(".css")) contentType = "text/css"
    if(location.endsWith(".js")) contentType = "text/javascript"
    if(location.endsWith(".png")) contentType = "image/png"

    return new Response(Deno.readTextFileSync("website/"+location), {
        headers:{"Content-Type":contentType}
    })
}


serve(handler, {port: 1928, hostname: "0.0.0.0"});
serve(handler, {port: 80, hostname: "0.0.0.0"});
