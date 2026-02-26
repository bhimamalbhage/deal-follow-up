/** Maximum days of inactivity before a deal is considered stale, by stage. */
// TODO: Restore real thresholds after testing
// discovery: 7, qualification: 5, proposal: 5, negotiation: 3, "contract sent": 2, default: 5
export const STALENESS_THRESHOLDS: Record<string, number> = {
  discovery: 0,
  qualification: 0,
  proposal: 0,
  negotiation: 0,
  "contract sent": 0,
  default: 0,
};

export function getThresholdForStage(stage: string): number {
  return STALENESS_THRESHOLDS[stage.toLowerCase()] ?? STALENESS_THRESHOLDS.default;
}
