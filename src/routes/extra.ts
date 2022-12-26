import { exists } from "../deps.ts";
import { DB } from "../index.ts";
import { User } from "../libs/User.ts";

/**
 * Get data about the currently authenicated user
 * Has to be a GET request.
 * @param {string} authenicationCookie
 * @returns {Response} Returns a response containing
 * session count and username in JSON format.
 */
export function whoami(req: Request) {
  let authenicated: User | undefined;

  if (req.headers.has("cookie")) {
    const session = req.headers.get("cookie")?.replace("session=", "");
    if (session) authenicated = DB.getBySession(session!);
  }

  if (authenicated) {
    return new Response(
      `{"username":"${authenicated.username}","sessions":${authenicated.openSessions.length}}`,
    );
  } else {
    return new Response("", { status: 403 });
  }
}
/**
 * Upload a skin to the currently authenicated user.
 * This automatically replaces any other previously loaded skin.
 * Has to be a POST request.
 *
 * @param {string} authenicationCookie
 * @param {Uint8Array} imageData
 * @returns {Response} Returns a response with a status code.
 */
export async function skinUpdate(req: Request) {
  let authenicated: User | undefined;

  if (req.headers.has("cookie")) {
    const session = req.headers.get("cookie")?.replace("session=", "");
    if (session) authenicated = DB.getBySession(session!);
  }

  if (authenicated) {
    const data = await req.arrayBuffer();
    if (data.byteLength > 5e+6) {
      return new Response("", { status: 413 });
    }

    Deno.writeFileSync(
      "./skins/" + authenicated.username + ".png", // TODO: Could be a chance we're not getting PNG. Use magic to check if we're actually getting PNG
      new Uint8Array(data),
    );
    return new Response(`done`);
  } else {
    return new Response("", { status: 403 });
  }
}
/**
 * Show a skin of a user!
 * Ex. /skin/yourfriends.png
 * Has to be a GET request.
 *
 * @param {string} username
 * @returns {Response} Returns a response with the skin
 */
export async function skinRender(req: Request) {
  const path = new URL(req.url);
  if (await exists("./skins/" + path.pathname.substring(6))) {
    return new Response(
      await Deno.readFile("./skins/" + path.pathname.substring(6)),
      {
        headers: { "Content-Type": "image/png" },
      },
    );
  } else {
    return new Response(await Deno.readFile("./skins/!!missing.png"), {
      headers: { "Content-Type": "image/png" },
    });
  }
}
