import * as fs from "fs";
import * as path from "path";

// Hook script for SubagentStart event
// When called as a hook: receives JSON via stdin with agent_type
// When called manually: accepts agent name as CLI argument (fallback)
const input = await Bun.stdin.text();
let agentName: string;

if (input.trim()) {
  const data = JSON.parse(input);
  agentName = data.agent_type ?? "unknown";
} else {
  agentName = process.argv[2] ?? "unknown";
}

const logFile = path.join(process.cwd(), "agent.log");
const message = `[${new Date().toISOString()}] [claude] 🚀 Starting Agent: ${agentName}\n`;

console.log(message.trim());
fs.appendFileSync(logFile, message);
