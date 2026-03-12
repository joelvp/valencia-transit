import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "@/config/database";
import * as schema from "./schema";

export const db = drizzle(sql, { schema });
