import { ConnInfo, serve } from "https://deno.land/std@0.170.0/http/server.ts";
import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";
import { Md5 } from "./libs/md5.ts"
import { hashSalt } from "./config.ts"
import { ServerList } from "./libs/ServerList.ts";
import { HB, UnparsedHB } from "./libs/Parsing.ts";
import { Session, User } from "./libs/User.ts";
import { Server } from "./libs/Server.ts";
import { customHash, error, isNumeric } from "./deps.ts";
import { Database } from "./libs/Database.ts";

const serverList = new ServerList();
const DB = new Database();

async function handler(req: Request, conn: ConnInfo): Promise<Response> {
    const path = new URL(req.url);

    if(path.pathname == "/api/login") {
        if(req.method == "POST") {
            // Recieving post, new session trying to be created.
            let data;

            try {
                data = queryString.parse(new TextDecoder().decode(await req.arrayBuffer())) as unknown as { username: string, token: string, password: string }
            } catch {
                return error("failed to parse post data", 400);
            }

            const user = DB.getByUsername(data.username);

            if(!user) {
                return error("User does not exist", 404)
            }

            if(user.password == await customHash(data.password)) {
                const session = new Session();
                session.ownedBy = user.username;
                user.openSessions.push(session);
                DB.setWithUsername(user.username, user);

                const resp = new Response(`{"username":"cock","token":"${session}"}`);
                resp.headers.append("set-cookie", `session=${session}; HttpOnly; Path=/`)
                return resp;
            } else {
                return error("Password is incorrect", 403)
            }
        } else {
            if(req.headers.has("cookie")) {
                const session = req.headers.get("cookie")?.replace("session=", "")

                if(session) {
                    const user = DB.getBySession(session!);

                    if(!user) {
                        return error(`{"authenicated":false}`, 200); // no clue why the client wants 200
                    } else {
                        const resp = new Response(`{"username":"${user.username}","token":"${session}"}`);
                        resp.headers.append("set-cookie",`session=${session}; HttpOnly; Path=/`);
                        return resp
                    }

                } else {
                    return error(`{"authenicated":false}`, 200); // no clue why the client wants 200
                }
            }
        }
    }


    if(path.pathname == "/api/register" && req.method == "POST") {
        let data;

        try {
            const body = new TextDecoder().decode(await req.arrayBuffer())
            data = JSON.parse(body) as unknown as { username: string, password: string }
        } catch {
            return error("json fail", 400);
        }

        if(!(
            typeof data.username == "string" &&
            typeof data.password == "string"
        )) {
            return error("username and password have to be strings", 422);
        }

        if(DB.getByUsername(data.username)) {
            return error("username already exists", 409);
        }

        const user = new User();

        user.username = data.username;
        user.password = await customHash(data.password);

        DB.setWithUsername(user.username, user); // lets say were adding to a db here

        return new Response("suceeded")
    }
    if(path.pathname == "/heartbeat.jsp") {
        let hbData: UnparsedHB;
        const ip = conn.remoteAddr as Deno.NetAddr;

        if(req.method == "POST") {
            try {
                hbData = queryString.parse(new TextDecoder().decode(await req.arrayBuffer())) as unknown as UnparsedHB
            } catch {
                return error("failed to parse post data", 400);
            }
        } else {
            hbData = queryString.parse(path.search) as unknown as UnparsedHB
        }

        if(!(hbData.max && hbData.name && hbData.port && hbData.public && hbData.salt && hbData.users && hbData.version)) {
            return error("ur request invalid", 422);
        }

        if(!(
            isNumeric(hbData.max) &&
            isNumeric(hbData.port) &&
            isNumeric(hbData.users) &&
            isNumeric(hbData.version)
        )) {
            return error("max, port, users, or version are not numbers", 422);
        }

        if(!(hbData.public == "True" || hbData.public == "False")) {
            return error("public is supposed to be True or False", 422);
        }

        if(!(
            typeof hbData.salt == "string" &&
            typeof hbData.name == "string"
        )) {
            return error("salt and name have to be strings", 422);
        }

        if(hbData.software) {
            if(typeof hbData.software !== "string") {
                return error("software has to be a string", 422);
            }
        }

        const hash = new Md5().update(hashSalt + hbData.salt + ip.hostname).toString();

        const hb = new HB(hbData);

        if(!serverList.servers.get(hash)) {
            console.log(`(CREATED) Server update from ${hb.name}. Users: ${hb.users}, salt: ${hb.salt}, hash: ${hash}`)

            const server = new Server(hash, ip.hostname, hb);

            server.hooks.onDie.push(() => {
                console.log('Hook exploded. Removing from serverlist.')

                serverList.servers.delete(hash);
            })

            serverList.servers.set(hash, server);
        } else {
            serverList.servers.get(hash)!.update(hb);
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

    return new Response("404 Not Found", {status: 404})
}


serve(handler, {port: 1928, hostname: "0.0.0.0"});
serve(handler, {port: 80, hostname: "0.0.0.0"});
