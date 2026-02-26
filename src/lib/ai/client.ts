import OpenAI from "openai";
import { env } from "@/lib/env";

let cached: OpenAI | null = null;

export function openaiClient(): OpenAI {
  if (cached) return cached;
  cached = new OpenAI({ apiKey: env().OPENAI_API_KEY });
  return cached;
}
