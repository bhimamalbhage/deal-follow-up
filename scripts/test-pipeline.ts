#!/usr/bin/env tsx
/**
 * test-pipeline.ts — End-to-end test for the Deal Follow-Up pipeline
 *
 * Tests each step of the pipeline independently and reports results:
 *   1. Detect   — fetch stale deals from HubSpot
 *   2. Score    — AI urgency scoring via OpenAI
 *   3. Draft    — AI email drafting via OpenAI
 *   4. Slack    — post Slack notifications + persist records
 *
 * Usage (run from project root):
 *   npm run test:pipeline              # full pipeline (all 4 steps)
 *   npm run test:pipeline -- detect   # step 1 only
 *   npm run test:pipeline -- score    # steps 1–2
 *   npm run test:pipeline -- draft    # steps 1–3
 *   npm run test:pipeline -- slack    # steps 1–4 (sends to Slack)
 *
 * Requires .env.local with:
 *   HUBSPOT_ACCESS_TOKEN, OPENAI_API_KEY,
 *   SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_CHANNEL_ID
 */

import { config } from "dotenv";
config({ path: ".env.local" }); // load before any env-dependent imports

import { detectStalDeals } from "@/lib/pipeline/detect";
import { scoreStalDeals, type ScoredDeal } from "@/lib/pipeline/score";
import { draftEmails, type DraftedDeal } from "@/lib/pipeline/draft";
import { notifyAll } from "@/lib/pipeline/notify";
import type { DealContext } from "@/types/deal";
import type { FollowUpRecord } from "@/types/follow-up";

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;

const bold = (s: string) => `${C.bold}${s}${C.reset}`;
const dim = (s: string) => `${C.dim}${s}${C.reset}`;
const colored = (color: string, s: string) => `${color}${s}${C.reset}`;
const sep = (char = "─", w = 62) => dim(char.repeat(w));

function urgencyStyle(score: string): { emoji: string; color: string } {
  switch (score) {
    case "critical": return { emoji: "🔴", color: C.red };
    case "high":     return { emoji: "🟠", color: C.yellow };
    case "medium":   return { emoji: "🟡", color: C.blue };
    default:         return { emoji: "⚪", color: C.dim };
  }
}

// ─── Timed step runner ────────────────────────────────────────────────────────

async function runStep<T>(label: string, fn: () => Promise<T>): Promise<T> {
  process.stdout.write(`\n${colored(C.cyan, bold(`▶ ${label}`))}\n`);
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    console.log(`  ${colored(C.green, "✓")} Completed in ${bold(`${ms}ms`)}`);
    return result;
  } catch (err) {
    const ms = Date.now() - start;
    console.error(`  ${colored(C.red, "✗")} Failed after ${ms}ms`);
    throw err;
  }
}

// ─── Pretty printers ──────────────────────────────────────────────────────────

function printDetected(deals: DealContext[]) {
  console.log(`\n${sep()}`);
  console.log(bold(`  Step 1 — Stale Deals  `) + colored(C.cyan, `(${deals.length} found)`));
  console.log(sep());

  if (deals.length === 0) {
    console.log(dim("  No stale deals found. All deals are within their staleness thresholds.\n"));
    return;
  }

  for (const d of deals) {
    console.log(`\n  ${bold(d.dealName)}  ${dim(`(id: ${d.dealId})`)}`);
    console.log(`    Stage     ${d.dealStage}`);
    console.log(`    Amount    ${d.amount != null ? `$${d.amount.toLocaleString()}` : "—"}`);
    console.log(`    Close     ${d.closeDate ?? "—"}`);
    console.log(`    Contact   ${d.contactName} <${d.contactEmail}>`);
    console.log(`    Owner     ${d.ownerEmail}`);
    console.log(
      `    Stale     ${colored(C.yellow, bold(`${d.daysSinceLastActivity} day(s)`))} without activity`
    );
    console.log(`    Emails    ${d.recentEmails.length} recent email(s) on record`);
  }
  console.log("");
}

function printScored(scored: ScoredDeal[]) {
  console.log(`\n${sep()}`);
  console.log(bold(`  Step 2 — Urgency Scores  `) + colored(C.magenta, `(${scored.length} scored)`));
  console.log(sep());

  for (const { deal, urgency } of scored) {
    const { emoji, color } = urgencyStyle(urgency.score);
    console.log(
      `\n  ${emoji} ${bold(deal.dealName)}  ${colored(color, bold(urgency.score.toUpperCase()))}`
    );
    console.log(`    ${dim(urgency.reason)}`);
  }
  console.log("");
}

function printDrafted(drafted: DraftedDeal[]) {
  console.log(`\n${sep()}`);
  console.log(bold(`  Step 3 — Email Drafts  `) + colored(C.blue, `(${drafted.length} drafted)`));
  console.log(sep());

  for (const { deal, urgency, draft } of drafted) {
    const { emoji, color } = urgencyStyle(urgency.score);
    console.log(
      `\n  ${emoji} ${bold(deal.dealName)}  ${colored(color, urgency.score)}`
    );
    console.log(`    To       ${deal.contactName} <${deal.contactEmail}>`);
    console.log(`    Subject  ${bold(draft.subject)}`);
    const preview = draft.body.replace(/\n+/g, " ").slice(0, 140);
    console.log(`    Body     ${dim(preview + (draft.body.length > 140 ? "…" : ""))}`);
  }
  console.log("");
}

function printNotified(records: FollowUpRecord[]) {
  console.log(`\n${sep()}`);
  console.log(bold(`  Step 4 — Slack Notifications  `) + colored(C.green, `(${records.length} sent)`));
  console.log(sep());

  for (const r of records) {
    console.log(`\n  ${colored(C.green, "✓")} ${bold(r.dealName)}`);
    console.log(`    Record ID   ${r.id}`);
    console.log(`    Slack ts    ${r.slackMessageTs ?? "—"}`);
    console.log(`    Status      ${colored(C.yellow, r.status)}`);
  }
  console.log("");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary(stats: {
  stale: number;
  scored: number;
  drafted: number;
  notified: number;
  durationMs: number;
}) {
  console.log(`\n${sep("═")}`);
  console.log(bold("  Pipeline Test Summary"));
  console.log(sep("═"));
  console.log(`  Stale deals detected     ${bold(String(stats.stale))}`);
  console.log(`  Deals scored             ${bold(String(stats.scored))}`);
  console.log(`  Emails drafted           ${bold(String(stats.drafted))}`);
  console.log(`  Slack notifications sent ${bold(String(stats.notified))}`);
  console.log(`  Total duration           ${bold(`${stats.durationMs}ms`)}`);
  console.log(sep("═"));
  console.log("");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const mode = (process.argv[2] ?? "slack").toLowerCase();
  const validModes = ["detect", "score", "draft", "slack"];

  if (!validModes.includes(mode)) {
    console.error(
      `${colored(C.red, "Error:")} Unknown mode "${mode}". Valid modes: ${validModes.join(", ")}`
    );
    process.exit(1);
  }

  const totalStart = Date.now();

  console.log(`\n${sep("═")}`);
  console.log(bold("  Deal Follow-Up — Pipeline Test Runner"));
  console.log(sep());
  console.log(`  Mode   ${bold(mode)}`);
  console.log(`  Time   ${new Date().toLocaleString()}`);
  console.log(sep("═"));

  const stats = { stale: 0, scored: 0, drafted: 0, notified: 0, durationMs: 0 };

  // Step 1: Detect
  const staleDeals = await runStep("Detecting stale deals via HubSpot", detectStalDeals);
  stats.stale = staleDeals.length;
  printDetected(staleDeals);

  if (mode === "detect" || staleDeals.length === 0) {
    stats.durationMs = Date.now() - totalStart;
    printSummary(stats);
    return;
  }

  // Step 2: Score
  const scoredDeals = await runStep(
    `Scoring urgency for ${staleDeals.length} deal(s) via OpenAI`,
    () => scoreStalDeals(staleDeals)
  );
  stats.scored = scoredDeals.length;
  printScored(scoredDeals);

  if (mode === "score") {
    stats.durationMs = Date.now() - totalStart;
    printSummary(stats);
    return;
  }

  // Step 3: Draft
  const draftedDeals = await runStep(
    `Drafting follow-up emails for ${scoredDeals.length} deal(s) via OpenAI`,
    () => draftEmails(scoredDeals)
  );
  stats.drafted = draftedDeals.length;
  printDrafted(draftedDeals);

  if (mode === "draft") {
    stats.durationMs = Date.now() - totalStart;
    printSummary(stats);
    return;
  }

  // Step 4: Notify via Slack
  const records = await runStep(
    `Sending ${draftedDeals.length} Slack notification(s) and persisting records`,
    () => notifyAll(draftedDeals)
  );
  stats.notified = records.length;
  printNotified(records);

  stats.durationMs = Date.now() - totalStart;
  printSummary(stats);
}

main().catch((err: unknown) => {
  console.error(`\n${colored(C.red, bold("Pipeline test failed:"))}`);
  console.error(err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(dim(err.stack.split("\n").slice(1).join("\n")));
  }
  process.exit(1);
});
