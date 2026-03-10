import * as fs from "fs";
import * as path from "path";

// Script to notify when an agent starts
// The agent name is passed as the first argument
const agentName = process.argv[2];
const logFile = path.join(process.cwd(), ".claude", "agent.log");

const message = agentName 
  ? `[${new Date().toISOString()}] 🚀 Starting Agent: ${agentName}\n`
  : `[${new Date().toISOString()}] 🚀 Agent started\n`;

console.log(message.trim());
fs.appendFileSync(logFile, message);
