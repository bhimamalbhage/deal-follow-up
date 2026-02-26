"use client";

import { useState, useEffect, useCallback } from "react";
import type { FollowUpRecord, UrgencyLevel } from "@/types/follow-up";

interface PipelineResult {
  success: boolean;
  staleDealsFound: number;
  followUpsCreated: number;
  records: Array<{
    id: string;
    dealName: string;
    urgency: UrgencyLevel;
    contact: string;
    status: string;
  }>;
  error?: string;
}

const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; text: string }> = {
  critical: { bg: "#fee2e2", text: "#991b1b" },
  high:     { bg: "#fef3c7", text: "#92400e" },
  medium:   { bg: "#dbeafe", text: "#1e40af" },
  low:      { bg: "#dcfce7", text: "#166534" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: "#fef9c3", text: "#854d0e" },
  sent:      { bg: "#dcfce7", text: "#166534" },
  dismissed: { bg: "#f1f5f9", text: "#64748b" },
};

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{
      background: colors.bg,
      color: colors.text,
      padding: "2px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 600,
      textTransform: "capitalize",
      display: "inline-block",
    }}>
      {label}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      padding: "20px 28px",
      minWidth: "160px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "32px", fontWeight: 700, color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

export default function Home() {
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [allRecords, setAllRecords] = useState<FollowUpRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await fetch("/api/records");
      const data = await res.json();
      if (data.success) setAllRecords(data.records);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  async function runPipeline() {
    setPipelineRunning(true);
    setPipelineResult(null);
    try {
      const res = await fetch("/api/pipeline/run");
      const data: PipelineResult = await res.json();
      setPipelineResult(data);
      if (data.success) await loadRecords();
    } catch (err) {
      setPipelineResult({
        success: false,
        staleDealsFound: 0,
        followUpsCreated: 0,
        records: [],
        error: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setPipelineRunning(false);
    }
  }

  const filteredRecords = statusFilter === "all"
    ? allRecords
    : allRecords.filter((r) => r.status === statusFilter);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      {/* Header */}
      <header style={{
        background: "#0f172a",
        color: "#f8fafc",
        padding: "18px 40px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{ fontSize: "20px" }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "18px" }}>Deal Follow-Up Agent</div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Autonomous sales follow-up pipeline</div>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 24px" }}>

        {/* Pipeline Runner */}
        <section style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "28px 32px",
          marginBottom: "28px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>Run Pipeline</h2>
              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                Detect stale deals → Score urgency → Draft emails → Send to Slack
              </p>
            </div>
            <button
              onClick={runPipeline}
              disabled={pipelineRunning}
              style={{
                background: pipelineRunning ? "#94a3b8" : "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: pipelineRunning ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background 0.15s",
              }}
            >
              {pipelineRunning ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  Running…
                </>
              ) : "▶ Run Now"}
            </button>
          </div>

          {/* Pipeline Result */}
          {pipelineResult && (
            <div style={{ marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "24px" }}>
              {!pipelineResult.success ? (
                <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: "8px", padding: "14px 18px", fontSize: "14px" }}>
                  <strong>Error:</strong> {pipelineResult.error}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
                    <StatCard label="Stale Deals Found" value={pipelineResult.staleDealsFound} />
                    <StatCard label="Follow-Ups Created" value={pipelineResult.followUpsCreated} />
                  </div>

                  {pipelineResult.staleDealsFound === 0 ? (
                    <div style={{ color: "#64748b", fontSize: "14px" }}>No stale deals detected in this run.</div>
                  ) : pipelineResult.records.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                            {["Deal", "Contact", "Urgency", "Status"].map((h) => (
                              <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pipelineResult.records.map((r) => (
                            <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 500, color: "#0f172a" }}>{r.dealName}</td>
                              <td style={{ padding: "10px 14px", color: "#475569" }}>{r.contact}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <Badge label={r.urgency} colors={URGENCY_COLORS[r.urgency] ?? { bg: "#f1f5f9", text: "#334155" }} />
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <Badge label={r.status} colors={STATUS_COLORS[r.status] ?? { bg: "#f1f5f9", text: "#334155" }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </section>

        {/* All Records */}
        <section style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "28px 32px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>All Follow-Up Records</h2>
              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                {allRecords.length} total record{allRecords.length !== 1 ? "s" : ""} stored
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["all", "pending", "sent", "dismissed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    background: statusFilter === s ? "#0f172a" : "#fff",
                    color: statusFilter === s ? "#fff" : "#475569",
                    borderColor: statusFilter === s ? "#0f172a" : "#e2e8f0",
                    transition: "all 0.15s",
                  }}
                >
                  {s}
                </button>
              ))}
              <button
                onClick={loadRecords}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "#fff",
                  color: "#475569",
                }}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {recordsLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }}>Loading records…</div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }}>
              No {statusFilter !== "all" ? statusFilter : ""} records found.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    {["Deal", "Contact", "Owner", "Urgency", "Draft Subject", "Status", "Created"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 500, color: "#0f172a", whiteSpace: "nowrap" }}>{r.dealName}</td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{r.contactName}<br /><span style={{ fontSize: "12px", color: "#94a3b8" }}>{r.contactEmail}</span></td>
                      <td style={{ padding: "10px 14px", color: "#475569", fontSize: "12px" }}>{r.ownerEmail}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <Badge label={r.urgencyScore} colors={URGENCY_COLORS[r.urgencyScore] ?? { bg: "#f1f5f9", text: "#334155" }} />
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", maxWidth: "160px" }}>{r.urgencyReason}</div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569", maxWidth: "220px" }}>
                        <div style={{ fontWeight: 500 }}>{r.draftSubject}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.draftBody.slice(0, 80)}…
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Badge label={r.status} colors={STATUS_COLORS[r.status] ?? { bg: "#f1f5f9", text: "#334155" }} />
                        {r.sentAt && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Sent {new Date(r.sentAt).toLocaleDateString()}</div>}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {new Date(r.createdAt).toLocaleDateString()}<br />
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* API Reference */}
        <section style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "24px 32px",
          marginTop: "28px",
        }}>
          <h2 style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a", marginBottom: "14px" }}>API Endpoints</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { method: "GET", path: "/api/pipeline/run", desc: "Trigger full detect → score → draft → notify pipeline" },
              { method: "GET", path: "/api/records", desc: "Fetch all stored follow-up records" },
              { method: "POST", path: "/api/webhooks/slack", desc: "Handle Slack interactive actions (approve / dismiss)" },
            ].map((e) => (
              <div key={e.path} style={{ display: "flex", alignItems: "baseline", gap: "10px", fontSize: "13px" }}>
                <span style={{ fontFamily: "monospace", background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontWeight: 600, minWidth: "42px", textAlign: "center" }}>{e.method}</span>
                <code style={{ fontFamily: "monospace", color: "#0f172a", fontWeight: 500 }}>{e.path}</code>
                <span style={{ color: "#64748b" }}>—</span>
                <span style={{ color: "#64748b" }}>{e.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
