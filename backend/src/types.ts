export interface ProcessedDoc {
  summary: string;
  type: string;
  tags: string[];
  faqs: Array<{ q: string; a: string }>;
  keyInsights: string[];
  category: string;
}

export interface Message {
  role: string;
  content: string;
}

export interface GapAnalysis {
  gaps: Array<{ area: string; severity: string; impact: string; recommendation: string }>;
  riskScore: number;
}
