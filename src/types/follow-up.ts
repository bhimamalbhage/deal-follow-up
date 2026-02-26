export type UrgencyLevel = "critical" | "high" | "medium" | "low";

export type FollowUpStatus = "pending" | "sent" | "dismissed";

export interface FollowUpRecord {
  id: string;
  dealId: string;
  dealName: string;
  contactEmail: string;
  contactName: string;
  ownerEmail: string;
  urgencyScore: UrgencyLevel;
  urgencyReason: string;
  draftSubject: string;
  draftBody: string;
  status: FollowUpStatus;
  slackMessageTs?: string;
  createdAt: string;
  sentAt?: string;
}
