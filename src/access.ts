import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export class Access {
  db: DatabaseSync;
  password: string;
  constructor(db: DatabaseSync, password: string) {
    if (password.length < 24)
      throw new Error(
        "La contraseña del propietario requiere al menos 24 caracteres.",
      );
    this.db = db;
    this.password = hash(password);
    db.exec(
      "CREATE TABLE IF NOT EXISTS owner_sessions (token TEXT PRIMARY KEY,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS login_attempts (id TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL)",
    );
  }
  authenticated(req: IncomingMessage) {
    const token = (req.headers.cookie ?? "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("sr_session="))
      ?.slice(11);
    return (
      !!token &&
      !!this.db
        .prepare("SELECT token FROM owner_sessions WHERE token=? AND expires>?")
        .get(hash(token), Date.now())
    );
  }
  login(
    req: IncomingMessage,
    res: ServerResponse,
    password: string,
    secure: boolean,
  ) {
    // Global limit is intentional for this single-owner MVP; forwarded IP headers are not trusted.
    const old = this.db
      .prepare("SELECT count,until FROM login_attempts WHERE id='owner'")
      .get();
    if (
      old &&
      (old.until as number) > Date.now() &&
      (old.count as number) >= 10
    )
      throw new Error("Demasiados intentos. Espera 15 minutos.");
    const received = Buffer.from(hash(password)),
      expected = Buffer.from(this.password);
    if (!timingSafeEqual(received, expected)) {
      this.db
        .prepare(
          "INSERT INTO login_attempts VALUES ('owner',1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=excluded.until",
        )
        .run(Date.now() + 900000, Date.now());
      throw new Error("Acceso inválido.");
    }
    this.db.prepare("DELETE FROM login_attempts WHERE id='owner'").run();
    const token = randomBytes(32).toString("base64url");
    this.db
      .prepare("DELETE FROM owner_sessions WHERE expires<?")
      .run(Date.now());
    this.db
      .prepare("INSERT INTO owner_sessions VALUES (?,?)")
      .run(hash(token), Date.now() + 12 * 3600000);
    res.setHeader(
      "Set-Cookie",
      `sr_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure ? "; Secure" : ""}`,
    );
  }
  logout(req: IncomingMessage, res: ServerResponse) {
    const token = (req.headers.cookie ?? "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("sr_session="))
      ?.slice(11);
    if (token)
      this.db
        .prepare("DELETE FROM owner_sessions WHERE token=?")
        .run(hash(token));
    res.setHeader(
      "Set-Cookie",
      "sr_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    );
  }
}
