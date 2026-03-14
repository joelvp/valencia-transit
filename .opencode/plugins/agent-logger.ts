import type { Plugin } from "@opencode-ai/plugin";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

const LOG_FILE = "agent.log";

async function log(worktree: string, emoji: string, message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [opencode] ${emoji} ${message}\n`;
  await appendFile(join(worktree, LOG_FILE), line);
}

export const AgentLogger: Plugin = async ({ worktree }) => {
  await log(worktree, "🟢", "Session started");

  return {
    "tool.execute.before": async (input, _output) => {
      if (input.tool === "bash") {
        await log(worktree, "🔧", `Tool: bash`);
      }
      if (input.tool === "skill") {
        await log(worktree, "📚", `Skill invoked: ${_output.args?.name ?? "unknown"}`);
      }
      if (input.tool === "task") {
        const agent = _output.args?.subagent_type ?? "unknown";
        const desc = _output.args?.description ?? "";
        await log(worktree, "🚀", `Agent: ${agent} — ${desc}`);
      }
    },
  };
};
