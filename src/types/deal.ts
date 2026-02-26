export interface DealContext {
  dealId: string;
  dealName: string;
  dealStage: string;
  amount: number | null;
  closeDate: string | null;
  ownerEmail: string;
  contactName: string;
  contactEmail: string;
  companyName: string | null;
  daysSinceLastActivity: number;
  recentEmails: EmailSummary[];
  notes: string[];
}

export interface EmailSummary {
  subject: string;
  from: string;
  to: string;
  date: string;
  bodyPreview: string;
}
