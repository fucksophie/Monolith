import { ConnInfo, serve } from "https://deno.land/std@0.170.0/http/server.ts";
import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";
import { Server, ServerList } from "./ServerList.ts";
import { Md5 } from "./libs/md5.ts"
import { HB, UnparsedHB } from "./data.ts";

function isNumeric(value: string) {
    return /^-?\d+$/.test(value);
}

const serverList = new ServerList();
const salt = "AAAAABBBBCCCC1238578SF!!" // this has to be never-changing (please)

async function handler(req: Request, conn: ConnInfo): Promise<Response> {
    const path = new URL(req.url);

    if(path.pathname == "/api/login") {
        const resp = new Response(`{"username":"cock","token":"ihatemylife3000"}`);
        resp.headers.append("set-cookie", "session=ihatemylife3000; HttpOnly; Path=/")
        return resp;
    }

    if(path.pathname == "/heartbeat.jsp") {
        let hbData: UnparsedHB;
        const ip = conn.remoteAddr as Deno.NetAddr;

        if(req.method == "POST") {
            hbData = queryString.parse(new TextDecoder().decode(await req.arrayBuffer())) as unknown as UnparsedHB
        } else {
            hbData = queryString.parse(path.search) as unknown as UnparsedHB
        }

        if(!(hbData.max && hbData.name && hbData.port && hbData.public && hbData.salt && hbData.users && hbData.version)) {
            console.log("Request failed. ", req.url)

            return new Response("how do i return a 403 (ur request invalid)");
        }

        if(!(
            isNumeric(hbData.max) &&
            isNumeric(hbData.port) &&
            isNumeric(hbData.users) &&
            isNumeric(hbData.version)
        )) {
            return new Response("how do i return a 403 (max, port, users, or version are not numbers)");
        }

        if(!(hbData.public == "True" || hbData.public == "False")) {
            return new Response("how do i return a 403 (public is supposed to be True or False)");
        }

        if(!(
            typeof hbData.salt == "string" &&
            typeof hbData.name == "string"
        )) {
            return new Response("how do i return a 403 (salt and name have to be strings)");
        }

        if(hbData.software) {
            if(typeof hbData.software !== "string") {
                return new Response("how do i return a 403 (software has to be a string)");
            }
        }

        const hash = new Md5().update(salt + hbData.salt + ip.hostname).toString();

        const hb = new HB();
        hb.max = +hbData.max
        hb.name = hbData.name
        hb.port = +hbData.port
        hb.public = hbData.public
        hb.salt = hbData.salt
        hb.users = +hbData.users
        hb.version = +hbData.version
        hb.software = hbData.software;

        if(!serverList.servers.get(hash)) {
            console.log(`(CREATED) Server update from ${hb.name}. Users: ${hb.users}, salt: ${hb.salt}, hash: ${hash}`)

            const server = new Server(hash, ip.hostname, hb);

            server.hooks.onDie.push(() => {
                console.log('Hook exploded. Removing from serverlist.')

                serverList.servers.delete(hash);
            })

            serverList.servers.set(hash, server);
        } else {
            console.log(`(UPDATED) Server update from ${hb.name}. Users: ${hb.users}, salt: ${hb.salt}, hash: ${hash}`)

            const server = serverList.servers.get(hash);
            server?.update(hb);
        }

        return new Response(`${path.origin}/play/${hash}`);
    } else if(path.pathname == "/api/servers") {
        return new Response(
            JSON.stringify(
                {
                    servers:[...serverList.servers.entries()]
                        .map(z => {
                            return {
                                country_abbr: z[1].country,
                                featured: z[1].featured,
                                hash: z[0],
                                ip: z[1].ip,
                                maxplayers: z[1].maxplayers,
                                mppass: z[1].getMPass("cock"),
                                name: z[1].name,
                                players: z[1].players,
                                port: z[1].port,
                                software: z[1].software,
                                uptime: Math.floor((Date.now() - z[1].firstPing)/1000),
                                web: false
                            }
                        })
                }
            )
        );
    }

    return new Response("Hello, World!");
}


serve(handler, {port: 1928, hostname: "0.0.0.0"});
serve(handler, {port: 80, hostname: "0.0.0.0"});
