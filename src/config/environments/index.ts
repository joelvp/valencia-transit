import type { AppEnv } from "@/config/env";
import localConfig from "./local";
import devConfig from "./dev";
import prodConfig from "./prod";

export interface PublicConfig {
  /**
   * IANA timezone the transit feed's service days and times are expressed in.
   * Every civil date and time in the app is resolved from this, via
   * ServiceCalendar. GTFS declares it per agency in agency.txt
   * (`agency_timezone`); MetroValencia publishes "Europe/Madrid".
   */
  timezone: string;
  liveDepartures: {
    /** Kill switch for the undocumented FGV real-time endpoint; false = scheduled only. */
    enabled: boolean;
    /** Global deadline for one live lookup (all FGV requests combined). */
    timeoutMs: number;
  };
}

export function loadPublicConfig(appEnv: AppEnv): PublicConfig {
  switch (appEnv) {
    case "local":
      return localConfig;
    case "dev":
      return devConfig;
    case "prod":
      return prodConfig;
  }
}
