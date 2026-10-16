import type { DisposalResult, DocumentCategory, HearingOutcome, OurSide, PaymentMode, Priority, Theme } from '@vakil/shared';

/** Domain types, mirroring the FRS data model (section 7). Dates are 'YYYY-MM-DD' (IST), times 'HH:mm'. */

export type ISODate = string;

export type CaseStatus = 'active' | 'reserved' | 'disposed' | 'closed';

export type NotificationPrefs = {
  eveningEnabled: boolean;
  eveningTime: string;
  morningEnabled: boolean;
  morningTime: string;
  needsUpdateEnabled: boolean;
};

export type Advocate = {
  id: string;
  fullName: string;
  email: string;
  enrolmentNo?: string;
  practiceAreas: string[];
  avatarUri?: string;
  theme: Theme;
  notificationPrefs: NotificationPrefs;
  onboardedAt: string | null;
};

export type Court = { id: string; name: string; city: string; isHidden: boolean };
export type CaseType = { id: string; name: string; isHidden: boolean };

export type Client = {
  id: string;
  fullName: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export type Case = {
  id: string;
  title: string;
  caseNumber?: string;
  caseYear?: number;
  cnr?: string;
  caseTypeId: string;
  courtId: string;
  courtRoom?: string;
  judge?: string;
  filingDate?: ISODate;
  ourSide: OurSide;
  petitioner?: string;
  respondent?: string;
  oppositeCounsel?: string;
  clientIds: string[];
  stage?: string;
  status: CaseStatus;
  disposalDate?: ISODate;
  disposalResult?: DisposalResult;
  priority: Priority;
  description?: string;
  /** Denormalized: earliest upcoming hearing (FRS 7). */
  nextHearingAt: ISODate | null;
  lastHearingAt: ISODate | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Hearing = {
  id: string;
  caseId: string;
  date: ISODate;
  time?: string;
  purpose?: string;
  courtRoom?: string;
  outcome?: HearingOutcome;
  outcomeNotes?: string;
  completedAt?: string;
};

export type Note = { id: string; caseId: string; title?: string; body: string; isPinned: boolean; createdAt: string; updatedAt: string };

export type CaseDocument = {
  id: string;
  caseId: string;
  fileName: string;
  category: DocumentCategory;
  mimeType: string;
  sizeBytes: number;
  uri?: string;
  createdAt: string;
};

export type Fee = { caseId: string; agreedAmount: number };
export type Payment = { id: string; caseId: string; amount: number; paidOn: ISODate; mode: PaymentMode; note?: string };

export type Task = { id: string; caseId: string | null; title: string; dueDate?: ISODate; completedAt?: string };

export type AppNotification = {
  id: string;
  type: 'reminder' | 'needs_update' | 'info';
  title: string;
  body: string;
  /** Expo Router href this notification opens. */
  deepLink?: string;
  readAt: string | null;
  createdAt: string;
};

/** Input for creating a case (FR-CASE-01..06). Title may be blank; it is composed from the parties. */
export type NewCase = {
  title?: string;
  caseNumber?: string;
  caseYear?: number;
  cnr?: string;
  caseTypeId: string;
  courtId: string;
  courtRoom?: string;
  judge?: string;
  filingDate?: ISODate;
  ourSide: OurSide;
  petitioner?: string;
  respondent?: string;
  oppositeCounsel?: string;
  clientIds: string[];
  stage?: string;
  nextHearingDate?: ISODate;
  nextHearingPurpose?: string;
  priority: Priority;
  description?: string;
};

export type CaseFilters = {
  q?: string;
  status?: CaseStatus | 'hearing_today' | 'overdue' | 'all';
  caseTypeId?: string;
  courtId?: string;
  clientId?: string;
  from?: ISODate;
  to?: ISODate;
  archived?: boolean;
  sort?: 'next_date' | 'recent' | 'updated' | 'title';
};

export type DashboardData = {
  weekCounts: Record<ISODate, number>;
  stats: { active: number; today: number; thisWeek: number; overdue: number };
  needsUpdate: number;
  unreadNotifications: number;
};
