import { DatabaseSync } from "node:sqlite";
import { initialState, type State } from "./domain.ts";
export class Store {
  db: DatabaseSync;
  constructor(path = ":memory:") {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS stockrescue_state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS mock_orders (key TEXT PRIMARY KEY, data TEXT NOT NULL);",
    );
    this.db
      .prepare("INSERT OR IGNORE INTO stockrescue_state VALUES (1, ?)")
      .run(JSON.stringify(initialState()));
  }
  read(): State {
    return JSON.parse(
      (
        this.db
          .prepare("SELECT data FROM stockrescue_state WHERE id=1")
          .get() as { data: string }
      ).data,
    ) as State;
  }
  save(s: State) {
    this.db
      .prepare("UPDATE stockrescue_state SET data=? WHERE id=1")
      .run(JSON.stringify(s));
  }
  transaction<T>(fn: (s: State) => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const s = this.read();
      const result = fn(s);
      this.save(s);
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
