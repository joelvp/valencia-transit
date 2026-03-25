import pino from "pino";

const appEnv = process.env["APP_ENV"] ?? "local";
const isLocal = appEnv === "local";

export const logger = pino({
  level: isLocal ? "debug" : "info",
  ...(isLocal && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});
