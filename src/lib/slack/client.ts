import { WebClient } from "@slack/web-api";
import { env } from "@/lib/env";

let cached: WebClient | null = null;

export function slackClient(): WebClient {
  if (cached) return cached;
  cached = new WebClient(env().SLACK_BOT_TOKEN);
  return cached;
}
