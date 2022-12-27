export const sessions = new Map<string, string[]>();
export const defaultSessionTime = 30 * 60000;

export class Session {
  "expiryTime": number;
  "sessionID": string;
  "ownedBy": string;

  constructor(timeItWouldTake = defaultSessionTime) { // 30 minute long sessions
    this.expiryTime = Date.now() + timeItWouldTake;
    this.sessionID = crypto.randomUUID().replaceAll("-", "");
  }
}

export class User {
  "username": string;
  "password": string; // argon2'd
  "openSessions": Session[] = [];
}
