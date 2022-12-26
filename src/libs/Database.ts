import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";
import { Session, User } from "./User.ts";

export class Database {
  private db: DB;

  constructor() {
    this.db = new DB("../users.db");
    this.db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password TEXT,
                sessions TEXT
            )
        `);

    // TODO: Maybe move this somewhere else?
    // TODO: Somehow improve this code. This system might not be the best for session handling
    // I have no clue yet. (needs testing.)

    setInterval(() => {
      const sessions = this.getAllSessions();
      sessions.forEach((s) => {
        if (s.expiryTime < Date.now()) {
          const user = this.getByUsername(s.ownedBy)!;

          user.openSessions = user.openSessions.filter((z) =>
            z.sessionID !== s.sessionID
          );

          this.setWithUsername(s.ownedBy, user);
        }
      });
    }, 10000);
  }

  getAllSessions(): Session[] {
    return this.db.queryEntries<{ sessions: string }>("select * from users")
      .map((z) => JSON.parse(z.sessions)).flat() as Session[];
  }

  getBySession(session: string): User | undefined {
    const rawUser = this.db.queryEntries<
      { username: string; password: string; sessions: string }
    >("select * from users")
      .find((z) => {
        return JSON.parse(z.sessions).find((y: Session) =>
          y.sessionID == session
        );
      });

    if (!rawUser) return;

    const user = new User();
    user.password = rawUser.password;
    user.username = rawUser.username;
    user.openSessions = JSON.parse(rawUser.sessions) as unknown as Session[];

    return user;
  }

  getByUsername(username: string): User | undefined {
    const rawUser = this.db.queryEntries<
      { username: string; password: string; sessions: string }
    >("select * from users where username = ?;", [username])[0];
    if (!rawUser) return;

    const user = new User();
    user.password = rawUser.password;
    user.username = rawUser.username;
    user.openSessions = JSON.parse(rawUser.sessions) as unknown as Session[];
    return user;
  }

  setWithUsername(username: string, user: User) {
    if (!this.getByUsername(username)) {
      this.db.query("INSERT INTO users VALUES(?, ?, ?);", [
        user.username,
        user.password,
        JSON.stringify(user.openSessions),
      ]);
    } else {
      this.db.query(
        "UPDATE users SET username = ?, password = ?, sessions = ? WHERE username = ?",
        [
          user.username,
          user.password,
          JSON.stringify(user.openSessions),
          user.username,
        ],
      );
    }
  }
}
