import type { PublicConfig } from "./index";

const config: PublicConfig = {
  timezone: "Europe/Madrid",
  liveDepartures: { enabled: true, timeoutMs: 1_500 },
};

export default config;
