import * as fs from "fs";
import * as path from "path";

// Hook script for PreToolUse on Skill tool
// Receives JSON via stdin with tool_input.skill containing the skill name
const input = await Bun.stdin.text();
const data = JSON.parse(input);
const skillName = data.tool_input?.skill ?? "unknown";

const logFile = path.join(process.cwd(), ".claude", "agent.log");
const message = `[${new Date().toISOString()}] Activating Skill: ${skillName}\n`;

console.log(message.trim());
fs.appendFileSync(logFile, message);
