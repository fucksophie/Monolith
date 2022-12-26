import { ConnInfo } from "https://deno.land/std@0.170.0/http/server.ts";
import { config } from "../config.ts"
import { error, isNumeric } from "../deps.ts";
import { DB, serverList } from "../index.ts";
import { Md5 } from "../libs/md5.ts";
import { HB, UnparsedHB } from "../libs/Parsing.ts";
import { Server } from "../libs/Server.ts";
import { User } from "../libs/User.ts";
import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";

/**
 * Get all servers in a format used by the Classicube client.
 * Has to be a GET request.
 *
 * @param {string} authenicationCookie
 * @returns {Response} Returns a response like
 * {"servers":[{"country_abbr":"NL","featured":false,..}]}
 * for unauthenicated users, or
 * {"servers":[{"mppass":"fdac0..."}]} for authenicated users.
 */
export function servers(req: Request): Response {
  let authenicated: User | undefined;

  if (req.headers.has("cookie")) {
    const session = req.headers.get("cookie")?.replace("session=", "");
    if (session) authenicated = DB.getBySession(session!);
  }

  return new Response(
    JSON.stringify(
      {
        servers: [...serverList.servers.entries()]
          .map((z) => {
            // deno-lint-ignore no-explicit-any
            const g: any = {
              country_abbr: z[1].country,
              featured: z[1].featured,
              hash: z[0],
              maxplayers: z[1].maxplayers,
              name: z[1].name,
              players: z[1].players,
              software: z[1].software,
              uptime: Math.floor((Date.now() - z[1].firstPing) / 1000),
              web: false,
            };

            if (authenicated) {
              g.mppass = z[1].getMPass(authenicated.username);
              g.ip = z[1].ip;
              g.port = z[1].port;
            }

            return g;
          }),
      },
    ),
  );
}
/**
 * Parse a heartbeat. Also creates a server incase it doesn't exist.
 * Can be either POST or GET. Parses both.
 *
 * @param {string} max
 * @param {string} port
 * @param {string} public
 * @param {string} salt
 * @param {string} users
 * @param {string} version
 * @param {string} software
 * @returns {Response} A response containing a error code or a play-link.
 */
export async function heartbeat(
  req: Request,
  conn: ConnInfo,
): Promise<Response> {
  const path = new URL(req.url);

  let hbData: UnparsedHB;
  const ip = conn.remoteAddr as Deno.NetAddr;

  if (req.method == "POST") {
    try {
      hbData = queryString.parse(
        new TextDecoder().decode(await req.arrayBuffer()),
      ) as unknown as UnparsedHB;
    } catch {
      return error("failed to parse post data", 400);
    }
  } else {
    hbData = queryString.parse(path.search) as unknown as UnparsedHB;
  }

  if (
    !(hbData.max && hbData.name && hbData.port && hbData.public &&
      hbData.salt && hbData.users && hbData.version)
  ) {
    return error("ur request invalid", 422);
  }

  if (
    !(
      isNumeric(hbData.max) &&
      isNumeric(hbData.port) &&
      isNumeric(hbData.users) &&
      isNumeric(hbData.version)
    )
  ) {
    return error("max, port, users, or version are not numbers", 422);
  }

  if (!(hbData.public == "True" || hbData.public == "False")) {
    return error("public is supposed to be True or False", 422);
  }

  if (
    !(
      typeof hbData.salt == "string" &&
      typeof hbData.name == "string"
    )
  ) {
    return error("salt and name have to be strings", 422);
  }

  if (hbData.software) {
    if (typeof hbData.software !== "string") {
      return error("software has to be a string", 422);
    }
  }

  const hash = new Md5().update(config.hashSalt + hbData.salt + ip.hostname) // TODO: salt probably should not be included here
    .toString();

  const hb = new HB(hbData);

  if (!serverList.servers.get(hash)) {
    console.log(
      `(CREATED) Server update from ${hb.name}. Users: ${hb.users}, salt: ${hb.salt}, hash: ${hash}`,
    );

    const server = new Server(hash, ip.hostname, hb);

    server.hooks.onDie.push(() => {
      console.log("Hook exploded. Removing from serverlist.");

      serverList.servers.delete(hash);
    });

    serverList.servers.set(hash, server);
  } else {
    serverList.servers.get(hash)!.update(hb);
  }
  return new Response(`${path.origin}/play/${hash}`);
}
