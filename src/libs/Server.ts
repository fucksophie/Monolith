import { Maxmind } from "https://deno.land/x/maxminddb@v1.2.0/mod.ts";
import { Md5 } from "./md5.ts";
import { HB } from "./Parsing.ts";

const mmdb = new Maxmind(await Deno.readFile("./mmdb.db"));

export class Server {
  "country": string; // Evaluated once added (only once!)
  "hash": string; // Custom hash for every server (crypto.uuid4().replaceAll("-", ""))
  "featured": boolean; // Controls wether hash is highlighted in CC client
  "name": string; // Hash name duh
  "players": number; // Amount of players..
  "maxplayers": number; // Amount of max players. This is **NEVER** enforced, just shown to clients
  "software": string; // Heartbeated software string, Max 25 characters.

  "port": number;
  "ip": string;

  "lastPing": number; // Last ping in milis
  "firstPing": number; // First ping in milis

  "salt": string; // Never shown to users! Calculated in authenicated users MPPass

  // deno-lint-ignore ban-types
  hooks: { onDie: Function[] } = {
    onDie: [],
  };

  constructor(hash: string, ip: string, data: HB) {
    try {
      this.country = mmdb.lookup_city(ip).country.iso_code;
    } catch {
      this.country = "US";
    }

    this.hash = hash;
    this.featured = false; // no lol

    this.update(data); // update HB-Related data.

    this.firstPing = Date.now();

    this.ip = ip;
    this.salt = data.salt;
  }

  update(data: HB) {
    this.name = data.name;
    this.players = data.users;
    this.maxplayers = data.max;
    this.software = data.software;
    this.lastPing = Date.now();
    this.port = data.port;
  }

  serverIsOnline() {
    return (Date.now() - this.lastPing) <= 60000;
  }

  getMPass(username: string): string {
    const md5 = new Md5();
    md5.update(this.salt + username);
    return md5.toString("hex");
  }
}
