const APP_ENV_VALUES = ["local", "dev", "prod"] as const;
export type AppEnv = (typeof APP_ENV_VALUES)[number];

export interface LocalSecrets {
  APP_ENV: "local";
  DATABASE_URL: string;
}

export interface DevSecrets {
  APP_ENV: "dev";
  DATABASE_URL: string;
  BOT_TOKEN: string;
  ADMIN_CHAT_ID: string;
  NAP_USERNAME: string;
  NAP_PASSWORD: string;
}

export interface ProdSecrets {
  APP_ENV: "prod";
  DATABASE_URL: string;
  BOT_TOKEN: string;
  ADMIN_CHAT_ID: string;
  NAP_USERNAME: string;
  NAP_PASSWORD: string;
}

export type Secrets = LocalSecrets | DevSecrets | ProdSecrets;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

export function loadSecrets(): Secrets {
  const APP_ENV = parseAppEnv(process.env["APP_ENV"]);

  switch (APP_ENV) {
    case "local":
      return {
        APP_ENV: "local",
        DATABASE_URL: requireEnv("DATABASE_URL"),
      };
    case "dev":
      return {
        APP_ENV: "dev",
        DATABASE_URL: requireEnv("DATABASE_URL"),
        BOT_TOKEN: requireEnv("BOT_TOKEN"),
        ADMIN_CHAT_ID: requireEnv("ADMIN_CHAT_ID"),
        NAP_USERNAME: requireEnv("NAP_USERNAME"),
        NAP_PASSWORD: requireEnv("NAP_PASSWORD"),
      };
    case "prod":
      return {
        APP_ENV: "prod",
        DATABASE_URL: requireEnv("DATABASE_URL"),
        BOT_TOKEN: requireEnv("BOT_TOKEN"),
        ADMIN_CHAT_ID: requireEnv("ADMIN_CHAT_ID"),
        NAP_USERNAME: requireEnv("NAP_USERNAME"),
        NAP_PASSWORD: requireEnv("NAP_PASSWORD"),
      };
  }
}
