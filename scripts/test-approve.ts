#!/usr/bin/env tsx
/**
 * test-approve.ts — Tests the Slack Approve button webhook flow
 *
 * Simulates what Slack sends when a user clicks "Approve & Send" on a
 * follow-up notification. Signs the request with SLACK_SIGNING_SECRET so
 * the local server accepts it.
 *
 * Usage (server must be running on localhost:3000):
 *   npm run test:approve                          # approve first pending record
 *   npm run test:approve -- <follow-up-id>        # approve specific record
 *   npm run test:approve -- <follow-up-id> dismiss # dismiss instead
 *
 * Requires .env.local with:
 *   SLACK_SIGNING_SECRET
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FollowUpRecord } from "@/types/follow-up";

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

const bold = (s: string) => `${C.bold}${s}${C.reset}`;
const dim = (s: string) => `${C.dim}${s}${C.reset}`;
const colored = (color: string, s: string) => `${color}${s}${C.reset}`;
const sep = (char = "─", w = 62) => dim(char.repeat(w));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readStore(): Promise<FollowUpRecord[]> {
  const filePath = path.join(process.cwd(), "data", "follow-ups.json");
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as FollowUpRecord[];
  } catch {
    return [];
  }
}

function buildSlackPayload(followUpId: string, actionId: "approve_send" | "dismiss"): string {
  const payload = {
    type: "block_actions",
    actions: [
      {
        action_id: actionId,
        value: followUpId,
        type: "button",
      },
    ],
    user: { id: "U_TEST", name: "test-user" },
    team: { id: "T_TEST", domain: "test" },
    channel: { id: "C_TEST", name: "test" },
    message: { ts: "0000000000.000000" },
    token: "test-token",
  };
  return `payload=${encodeURIComponent(JSON.stringify(payload))}`;
}

function signPayload(rawBody: string, timestamp: string, signingSecret: string): string {
  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(sigBasestring)
    .digest("hex");
  return `v0=${hmac}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error(colored(C.red, "Error: SLACK_SIGNING_SECRET not set in .env.local"));
    process.exit(1);
  }

  const serverUrl = "http://localhost:3000/api/webhooks/slack";

  // Parse args
  const argId = process.argv[2];
  const argAction = process.argv[3];
  const actionId: "approve_send" | "dismiss" =
    argAction === "dismiss" ? "dismiss" : "approve_send";

  // Load data store
  const records = await readStore();
  const pending = records.filter((r) => r.status === "pending");

  console.log(`\n${sep("═")}`);
  console.log(bold("  Deal Follow-Up — Approve Button Flow Test"));
  console.log(sep("═"));
  console.log(`  Action    ${bold(actionId === "approve_send" ? "Approve & Send" : "Dismiss")}`);
  console.log(`  Endpoint  ${bold(serverUrl)}`);
  console.log(`  Time      ${new Date().toLocaleString()}`);
  console.log(sep());

  // Print all records for context
  console.log(`\n  Data store has ${bold(String(records.length))} record(s):`);
  for (const r of records) {
    const statusColor = r.status === "pending" ? C.yellow : r.status === "sent" ? C.green : C.dim;
    console.log(
      `    ${colored(statusColor, r.status.padEnd(10))}  ${bold(r.dealName)}  ${dim(r.id)}`
    );
  }

  // Pick the target record
  let target: FollowUpRecord | undefined;
  if (argId) {
    target = records.find((r) => r.id === argId);
    if (!target) {
      console.error(`\n${colored(C.red, `Error: No record found with id "${argId}"`)}`);
      process.exit(1);
    }
  } else {
    target = pending[0];
    if (!target) {
      console.error(`\n${colored(C.red, "Error: No pending records found in data store.")}`);
      console.error(dim("  Run `npm run test:pipeline` first to generate records."));
      process.exit(1);
    }
  }

  console.log(`\n  Target  ${bold(target.dealName)}  ${dim(`(id: ${target.id})`)}`);
  console.log(`  Status  ${colored(C.yellow, target.status)}`);

  if (target.status !== "pending") {
    console.warn(
      `\n${colored(C.yellow, "Warning:")} Record status is "${target.status}", not "pending".`
    );
    console.warn(dim("  The webhook handler will return 404 for non-pending records."));
    console.warn(dim("  Proceeding anyway to test the full request path...\n"));
  }

  // Build and sign the payload
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = buildSlackPayload(target.id, actionId);
  const signature = signPayload(rawBody, timestamp, signingSecret);

  console.log(`\n${sep()}`);
  console.log(`  ${colored(C.cyan, bold("▶ Sending signed webhook POST..."))}`);
  console.log(sep());

  const start = Date.now();

  let response: Response;
  try {
    response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": signature,
      },
      body: rawBody,
    });
  } catch (err) {
    const ms = Date.now() - start;
    console.error(`\n  ${colored(C.red, "✗")} Request failed after ${ms}ms`);
    if (err instanceof Error && err.message.includes("ECONNREFUSED")) {
      console.error(
        colored(C.red, "\n  Connection refused — is the dev server running?")
      );
      console.error(dim("  Run `npm run dev` in another terminal, then retry.\n"));
    } else {
      console.error(err);
    }
    process.exit(1);
  }

  const ms = Date.now() - start;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  const statusColor = response.ok ? C.green : C.red;
  const statusIcon = response.ok ? "✓" : "✗";

  console.log(`\n  ${colored(statusColor, statusIcon)} HTTP ${bold(String(response.status))} in ${bold(`${ms}ms`)}`);
  console.log(`\n  Response body:`);
  console.log(`  ${dim(JSON.stringify(body, null, 2).replace(/\n/g, "\n  "))}`);

  if (!response.ok) {
    console.log(`\n${sep("═")}`);
    console.log(colored(C.red, bold("  FAILED")));
    console.log(sep("═"));
    console.log(`  Status    ${bold(String(response.status))}`);
    console.log(`  Body      ${JSON.stringify(body)}`);
    console.log("");

    if (response.status === 401) {
      console.log(colored(C.yellow, "  Hint: Signature verification failed."));
      console.log(dim("    → Check SLACK_SIGNING_SECRET in .env.local matches your Slack app."));
    } else if (response.status === 404) {
      console.log(colored(C.yellow, "  Hint: Record not found or already processed."));
      console.log(dim("    → Run `npm run test:pipeline` to create fresh pending records."));
    } else if (response.status === 500) {
      console.log(colored(C.yellow, "  Hint: Internal server error — check the Next.js server logs."));
    }
    process.exit(1);
  }

  console.log(`\n${sep("═")}`);
  console.log(colored(C.green, bold(`  SUCCESS — ${actionId === "approve_send" ? "Email approved and sent" : "Follow-up dismissed"}`)));
  console.log(sep("═"));
  console.log(`  Deal      ${bold(target.dealName)}`);
  console.log(`  Action    ${bold(actionId)}`);
  console.log(`  Duration  ${bold(`${ms}ms`)}`);
  console.log("");
}

main().catch((err: unknown) => {
  console.error(`\n${colored(C.red, bold("Test failed:"))}`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
