import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import type { InboundMessage } from "./whatsapp.ts";

export type Job = InboundMessage & { response: string | null };
export type Confirmation = {
  sender: string;
  proposalId: string;
  hash: string;
  expiresAt: number;
};
export class AgentStore {
  db: DatabaseSync;
  constructor(path = ":memory:") {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS agent_jobs (id TEXT PRIMARY KEY, sender TEXT NOT NULL, text TEXT NOT NULL, timestamp INTEGER NOT NULL, status TEXT NOT NULL, response TEXT, outbound_id TEXT);
      CREATE TABLE IF NOT EXISTS agent_confirmations (token TEXT PRIMARY KEY, sender TEXT NOT NULL, proposal_id TEXT NOT NULL, hash TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_alerts (key TEXT PRIMARY KEY, status TEXT NOT NULL);
      UPDATE agent_jobs SET status='QUEUED' WHERE status='WORKING';
      UPDATE agent_jobs SET status='REVIEW' WHERE status='SENDING';
      UPDATE agent_alerts SET status='REVIEW' WHERE status='SENDING';`);
  }
  enqueue(m: InboundMessage) {
    return (
      this.db
        .prepare(
          "INSERT OR IGNORE INTO agent_jobs (id,sender,text,timestamp,status) VALUES (?,?,?,?,'QUEUED')",
        )
        .run(m.id, m.from, m.text, m.timestamp).changes === 1
    );
  }
  claim(): Job | undefined {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db
        .prepare(
          "SELECT id, sender, text, timestamp, response FROM agent_jobs WHERE status IN ('QUEUED','READY') ORDER BY rowid LIMIT 1",
        )
        .get() as
        | {
            id: string;
            sender: string;
            text: string;
            timestamp: number;
            response: string | null;
          }
        | undefined;
      if (row)
        this.db
          .prepare("UPDATE agent_jobs SET status='WORKING' WHERE id=?")
          .run(row.id);
      this.db.exec("COMMIT");
      return row ? { ...row, from: row.sender } : undefined;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  mark(
    id: string,
    status: "READY" | "SENDING" | "DONE" | "REVIEW",
    response?: string,
    outboundId?: string,
  ) {
    this.db
      .prepare(
        "UPDATE agent_jobs SET status=?, response=COALESCE(?,response), outbound_id=COALESCE(?,outbound_id) WHERE id=?",
      )
      .run(status, response ?? null, outboundId ?? null, id);
  }
  confirmation(c: Confirmation) {
    const token = randomBytes(8).toString("hex");
    this.db
      .prepare("INSERT INTO agent_confirmations VALUES (?,?,?,?,?)")
      .run(token, c.sender, c.proposalId, c.hash, c.expiresAt);
    return token;
  }
  getConfirmation(token: string, sender: string): Confirmation | undefined {
    const row = this.db
      .prepare(
        "SELECT proposal_id, hash, expires_at FROM agent_confirmations WHERE token=? AND sender=?",
      )
      .get(token, sender) as
      { proposal_id: string; hash: string; expires_at: number } | undefined;
    return row
      ? {
          sender,
          proposalId: row.proposal_id,
          hash: row.hash,
          expiresAt: row.expires_at,
        }
      : undefined;
  }
  claimAlert(key: string) {
    return (
      this.db
        .prepare("INSERT OR IGNORE INTO agent_alerts VALUES (?,'SENDING')")
        .run(key).changes === 1
    );
  }
  markAlert(key: string, status: "DONE" | "REVIEW") {
    this.db
      .prepare("UPDATE agent_alerts SET status=? WHERE key=?")
      .run(status, key);
  }
  close() {
    this.db.close();
  }
}
