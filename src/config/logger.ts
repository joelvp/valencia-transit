import pino from "pino";

const appEnv = process.env["APP_ENV"] ?? "local";
const isPretty = appEnv === "local" || appEnv === "dev";

export const logger = pino({
  level: appEnv === "local" ? "debug" : "info",
  ...(isPretty && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname", singleLine: true },
    },
  }),
});

export function createLogger(module: string) {
  return logger.child({ module });
}
