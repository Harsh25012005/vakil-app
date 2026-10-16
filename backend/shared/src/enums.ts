// Single source of truth for domain enums (FRS section 7). Mirrors DB check constraints.

export const CASE_STATUSES = ['active', 'reserved', 'disposed', 'closed'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const OUR_SIDES = [
  'petitioner',
  'respondent',
  'complainant',
  'accused',
  'appellant',
  'other',
] as const;
export type OurSide = (typeof OUR_SIDES)[number];

export const PRIORITIES = ['normal', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const HEARING_OUTCOMES = [
  'adjourned',
  'heard',
  'arguments_done',
  'evidence',
  'reserved',
  'disposed',
  'not_reached',
  'other',
] as const;
export type HearingOutcome = (typeof HEARING_OUTCOMES)[number];

export const DISPOSAL_RESULTS = ['allowed', 'dismissed', 'settled', 'withdrawn', 'other'] as const;
export type DisposalResult = (typeof DISPOSAL_RESULTS)[number];

export const THEMES = ['dark', 'light', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const DOCUMENT_CATEGORIES = ['petition', 'order', 'evidence', 'vakalatnama', 'other'] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DEFAULT_CASE_TYPES = [
  'Civil Suit',
  'Criminal Case',
  'NI Act 138',
  'Family',
  'MACT',
  'Writ',
  'Appeal',
  'Bail',
  'Consumer',
  'Other',
] as const;
