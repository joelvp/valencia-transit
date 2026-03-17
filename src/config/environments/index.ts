import type { AppEnv } from "@/config/env";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- will be populated with feature flags, limits, etc.
export interface PublicConfig {}

export async function loadPublicConfig(appEnv: AppEnv): Promise<PublicConfig> {
  switch (appEnv) {
    case "local": {
      const { default: config } = await import("./local");
      return config;
    }
    case "dev": {
      const { default: config } = await import("./dev");
      return config;
    }
    case "prod": {
      const { default: config } = await import("./prod");
      return config;
    }
  }
}
