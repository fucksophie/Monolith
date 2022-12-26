export const sessions = new Map<string, string[]>();

export class Session {
  "expiryTime": number;
  "sessionID": string;
  "ownedBy": string;

  constructor(timeItWouldTake = 5 * 60000) {
    this.expiryTime = Date.now() + timeItWouldTake;
    this.sessionID = crypto.randomUUID().replaceAll("-", "");
  }
}

export class User {
  "username": string;
  "password": string; // argon2'd
  "openSessions": Session[] = [];
}
