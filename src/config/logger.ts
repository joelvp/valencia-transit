import pino from "pino";

const appEnv = process.env["APP_ENV"] ?? "local";
const isLocal = appEnv === "local";

export const logger = pino({
  level: isLocal ? "debug" : "info",
  ...(isLocal && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname" },
    },
  }),
});

export function createLogger(module: string) {
  return logger.child({ module });
}
