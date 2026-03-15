const APP_ENV_VALUES = ["local", "staging", "production"] as const;
type AppEnv = (typeof APP_ENV_VALUES)[number];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] ?? defaultValue;
}

function parseAppEnv(raw: string | undefined): AppEnv {
  const value = raw ?? "local";
  if (!APP_ENV_VALUES.includes(value as AppEnv)) {
    throw new Error(
      `Invalid APP_ENV value: "${value}". Must be one of: ${APP_ENV_VALUES.join(", ")}`,
    );
  }
  return value as AppEnv;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  APP_ENV: parseAppEnv(process.env["APP_ENV"]),
  BOT_TOKEN: requireEnv("BOT_TOKEN"),
  ADMIN_CHAT_ID: requireEnv("ADMIN_CHAT_ID"),
  NAP_USERNAME: optionalEnv("NAP_USERNAME"),
  NAP_PASSWORD: optionalEnv("NAP_PASSWORD"),
} as const;
