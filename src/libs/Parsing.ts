export class UnparsedHB {
  "max": string; // coerced to number
  "name": string;
  "port": string;
  "public": string;
  "salt": string;
  "users": string;
  "version": string;
  "software": string;
}

export class HB {
  "max": number; // coerced to number
  "name": string;
  "port": number;
  "public": "True" | "False";
  "salt": string;
  "users": number;
  "version": number;
  "software": string;

  constructor(hb: {
    "max": string; // coerced to number
    "name": string;
    "port": string;
    "public": string;
    "salt": string;
    "users": string;
    "version": string;
    "software": string;
  }) {
    this.max = +hb.max;
    this.name = hb.name;
    this.port = +hb.port;
    this.public = hb.public as "True" | "False";
    this.salt = hb.salt;
    this.users = +hb.users;
    this.version = +hb.version;
    this.software = hb.software;
  }
}
