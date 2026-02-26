import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { FollowUpRecord } from "@/types/follow-up";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "follow-ups.json");

async function readStore(): Promise<FollowUpRecord[]> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as FollowUpRecord[];
  } catch {
    return [];
  }
}

async function writeStore(records: FollowUpRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export async function getAll(): Promise<FollowUpRecord[]> {
  return readStore();
}

export async function getById(id: string): Promise<FollowUpRecord | undefined> {
  const records = await readStore();
  return records.find((r) => r.id === id);
}

export async function getByDealId(dealId: string): Promise<FollowUpRecord | undefined> {
  const records = await readStore();
  return records.find((r) => r.dealId === dealId && r.status === "pending");
}

export async function save(record: FollowUpRecord): Promise<void> {
  const records = await readStore();
  records.push(record);
  await writeStore(records);
}

export async function update(
  id: string,
  partial: Partial<FollowUpRecord>,
): Promise<FollowUpRecord | undefined> {
  const records = await readStore();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  records[index] = { ...records[index], ...partial };
  await writeStore(records);
  return records[index];
}
