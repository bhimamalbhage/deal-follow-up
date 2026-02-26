import { Client } from "@hubspot/api-client";
import { env } from "@/lib/env";

let cached: Client | null = null;

export function hubspotClient(): Client {
  if (cached) return cached;
  cached = new Client({ accessToken: env().HUBSPOT_ACCESS_TOKEN });
  return cached;
}
