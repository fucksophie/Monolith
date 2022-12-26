import { exists } from "../deps.ts";
import { DB } from "../index.ts";
import { User } from "../libs/User.ts";

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
      "./skins/" + authenicated.username + ".png",
      new Uint8Array(data),
    );
    return new Response(`done`);
  } else {
    return new Response("", { status: 403 });
  }
}

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
