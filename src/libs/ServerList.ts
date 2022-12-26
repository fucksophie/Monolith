import { Server } from "./Server.ts";

export class ServerList {
  servers: Map<string, Server> = new Map();

  constructor() {
    setInterval(() => {
      this.servers.forEach((z) => {
        if (!z.serverIsOnline()) {
          console.log(`${z.name} Server has died :(`);
          z.hooks.onDie.forEach((z) => z());
        }
      });
    }, 1000);
  }
}
