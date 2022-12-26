import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";
import { customHash, error } from "../deps.ts";
import { DB } from "../index.ts";
import { Session, User } from "../libs/User.ts";

/**
 * Log-in to a account.
 * Both POST and GET requests are supported.
 * Automatically refreshes sessions whenever attempting to login via GET. (cc client)
 *
 * @param {string} username
 * @param {string} password
 * @returns {Response} Returns a status code.
 */
export async function login(req: Request): Promise<Response> {
  if (req.method == "POST") {
    // Recieving post, new session trying to be created.
    let data;

    try {
      data = queryString.parse(
        new TextDecoder().decode(await req.arrayBuffer()),
      ) as unknown as { username: string; token: string; password: string };
    } catch {
      return error("failed to parse post data", 400);
    }

    const user = DB.getByUsername(data.username);

    if (!user) {
      return error("User does not exist", 404);
    }

    if (user.password == await customHash(data.password)) {
      const session = new Session();
      session.ownedBy = user.username;
      user.openSessions.push(session);
      DB.setWithUsername(user.username, user);

      const resp = new Response(
        `{"username": "${user.username}","token":"${session.sessionID}"}`,
      );
      resp.headers.append(
        "set-cookie",
        `session=${session.sessionID}; HttpOnly; Path=/`,
      );
      return resp;
    } else {
      return error("Password is incorrect", 403);
    }
  } else {
    if (req.headers.has("cookie")) {
      const oldSession = req.headers.get("cookie")?.replace("session=", "");

      if (oldSession) {
        const user = DB.getBySession(oldSession!);

        if (!user) {
          return error(`{"authenicated":false}`, 200); // no clue why the client wants 200
        } else {
          // Create a new session, delete the last one. Refreshes it.
          const session = new Session();
          session.ownedBy = user.username;
          user.openSessions.push(session);
          user.openSessions = user.openSessions.filter(z => z.sessionID !== oldSession)
          DB.setWithUsername(user.username, user);

          const resp = new Response(
            `{"username":"${user.username}","token":"${session.sessionID}"}`,
          );
          resp.headers.append(
            "set-cookie",
            `session=${session.sessionID}; HttpOnly; Path=/`,
          );
          return resp;
        }
      } else {
        return error(`{"authenicated":false}`, 200); // no clue why the client wants 200
      }
    }
  }

  return new Response();
}

/**
 * Change the password of a user.
 * Has to be a POST request, containing JSON data. Headers don't matter.
 *
 * @param {string} authenicationCookie
 * @param {string} password
 * @param {string} currentPassword
 * @returns {Response} Returns a status code.
 */
export async function changePassword(req: Request): Promise<Response> {
  let authenicated: User | undefined;

  if (req.headers.has("cookie")) {
    const session = req.headers.get("cookie")?.replace("session=", "");
    if (session) authenicated = DB.getBySession(session!);
  }

  if (!authenicated) return new Response("", { status: 403 });

  let data;

  try {
    const body = new TextDecoder().decode(await req.arrayBuffer());
    data = JSON.parse(body) as unknown as {
      password: string;
      currentPassword: string;
    };
  } catch {
    return error("json fail", 400);
  }

  if (
    !(
      typeof data.password == "string" &&
      typeof data.currentPassword == "string"
    )
  ) {
    return error("currentPassword and password have to be strings", 422);
  }

  if (authenicated.password !== await customHash(data.currentPassword)) {
    return new Response("failed matching current password and old one", {
      status: 403,
    });
  }

  authenicated.openSessions = []
  authenicated.password = await customHash(data.password);

  DB.setWithUsername(authenicated.username, authenicated);

  return new Response("suceeded");
}

/**
 * Register a user
 * Only use POST.
 *
 * @param {string} username
 * @param {string} password
 * @returns {Response} Returns a status code.
 */
export async function register(req: Request): Promise<Response> {
  let data;

  try {
    const body = new TextDecoder().decode(await req.arrayBuffer());
    data = JSON.parse(body) as unknown as {
      username: string;
      password: string;
    };
  } catch {
    return error("json fail", 400);
  }

  if (
    !(
      typeof data.username == "string" &&
      typeof data.password == "string"
    )
  ) {
    return error("username and password have to be strings", 422);
  }

  if (DB.getByUsername(data.username)) {
    return error("username already exists", 409);
  }

  const user = new User();

  user.username = data.username;
  user.password = await customHash(data.password);

  DB.setWithUsername(user.username, user);

  return new Response("suceeded");
}
