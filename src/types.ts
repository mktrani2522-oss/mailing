export type ProviderType = 'gmail' | 'hotmail' | 'outlook' | 'yahoo' | 'aol' | 'sendgrid' | 'aws_ses' | 'mailgun' | 'brevo' | 'smtp2go' | 'postmark' | 'custom' | 'simulator';

export type EmailMode = 'normal' | 'bcc' | 'html';

export interface SendingAccount {
  provider: ProviderType;
  email: string;
  password?: string;
  host?: string;
  port?: number;
  secure?: boolean;
}

export interface Recipient {
  email: string;
  fields?: Record<string, string>;
}

export interface VerificationResult {
  email: string;
  status: 'valid' | 'risky' | 'invalid';
  reason: string;
  isDisposable: boolean;
  isRoleAccount: boolean;
  isFreeProvider: boolean;
  mxRecords: string[];
}

export interface OpenEvent {
  id: string;
  email: string;
  openedAt: string;
  count: number;
}

export interface SendLog {
  id: string;
  email: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  details: string;
  personalizedSubject?: string;
  personalizedBody?: string;
  openCount?: number;
  lastOpenedAt?: string;
}

export type TabType = 'verify' | 'merge' | 'autoreply';

