import * as fs from "fs";
import * as path from "path";

// Skill tracking hook — called explicitly at the start of each skill.
// Usage: bun ./.claude/hooks/echo_skill_start.ts <skill-name>
const skillName = process.argv[2] ?? "unknown";

const logFile = path.join(process.cwd(), ".claude", "agent.log");
const message = `[${new Date().toISOString()}] Activating Skill: ${skillName}\n`;

console.log(message.trim());
fs.appendFileSync(logFile, message);
