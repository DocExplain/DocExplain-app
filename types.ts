export enum Screen {
  HOME = 'HOME',
  RESULT = 'RESULT',
  SMART_TEMPLATES = 'SMART_TEMPLATES',
  DRAFT = 'DRAFT',
  HISTORY = 'HISTORY',
  PAYWALL = 'PAYWALL',
  FAQ = 'FAQ'
}

export interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  warning?: string;
  fileName: string;
  timestamp: string;
}

export interface DraftRequest {
  tone: 'Professional' | 'Friendly' | 'Firm';
  template: 'Dispute' | 'Clarify' | 'Accept' | 'Extension';
  originalContext: string;
}

export interface HistoryItem extends AnalysisResult {
  id: string;
}

export interface FileData {
  name: string;
  content: string; // Text content
  type: 'pdf' | 'docx' | 'txt' | 'image';
}