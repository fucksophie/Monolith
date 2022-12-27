export class Config {
  "hashSalt": string;
  "passwordSalt": string;
  "ports": number[];
  "trustXForwardedFor": boolean;
  constructor(name = "../config.json") {
    const data = JSON.parse(Deno.readTextFileSync(name));

    this.hashSalt = data.hashSalt;
    this.passwordSalt = data.passwordSalt;
    this.ports = data.ports;
    this.trustXForwardedFor = data.trustXForwardedFor;
  }
}

export const config = new Config();
