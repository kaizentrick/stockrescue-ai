import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
const label = "com.kaizentrick.stockrescue",
  domain = "gui/" + process.getuid!(),
  plist = homedir() + "/Library/LaunchAgents/" + label + ".plist";
const run = (args: string[]) =>
  execFileSync("/bin/launchctl", args, { stdio: "inherit" });
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
const command = process.argv[2] ?? "status";
if (command === "install") {
  mkdirSync(homedir() + "/Library/LaunchAgents", { recursive: true });
  writeFileSync(
    plist,
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${escape(process.execPath)}</string><string>${escape(resolve("src/launch.ts"))}</string><string>--tunnel</string></array><key>WorkingDirectory</key><string>${escape(resolve("."))}</string><key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>60</integer><key>StandardOutPath</key><string>/dev/null</string><key>StandardErrorPath</key><string>/dev/null</string></dict></plist>`,
    { mode: 0o600 },
  );
  run(["bootstrap", domain, plist]);
  console.log(
    "Servicio instalado. 1Password debe permitir leer los secretos al iniciar.",
  );
} else if (command === "stop") run(["bootout", domain + "/" + label]);
else if (command === "start") run(["bootstrap", domain, plist]);
else if (command === "restart") run(["kickstart", "-k", domain + "/" + label]);
else if (command === "status") {
  try {
    const result = execFileSync(
      "/bin/launchctl",
      ["print", domain + "/" + label],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    console.log(
      result
        .split("\n")
        .filter((l) => /state =|pid =|last exit code/.test(l))
        .join("\n"),
    );
  } catch {
    console.log("Servicio no cargado.");
  }
  if (existsSync(".data/public-url"))
    console.log(readFileSync(".data/public-url", "utf8").trim());
} else throw new Error("Usa install, start, stop, restart o status.");
