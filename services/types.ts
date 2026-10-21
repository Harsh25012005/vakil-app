import type { DisposalResult, DocumentCategory, HearingOutcome, Theme } from '@vakil/shared';

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

/** level / stateCode / districtCode: eCourts scope, set when the court was picked from the court directory. */
export type Court = { id: string; name: string; city: string; isHidden: boolean; directoryId?: string; level?: CourtLevel; stateCode?: string; districtCode?: string };
export type CourtLevel = 'SC' | 'HC' | 'DC' | 'TRIBUNAL' | 'OTHER';
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
  filingNumber?: string;
  caseTypeId: string;
  courtId: string;
  courtRoom?: string;
  judge?: string;
  filingDate?: ISODate;
  petitioner?: string;
  respondent?: string;
  oppositeCounsel?: string;
  clientIds: string[];
  stage?: string;
  status: CaseStatus;
  /** Status as eCourts shows it ("Pending"), and when the case was last read from eCourts. */
  ecourtsStatus?: string;
  ecourtsSyncedAt?: string;
  disposalDate?: ISODate;
  disposalResult?: DisposalResult;
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
  /** Item (serial) number on that day's cause list. */
  itemNumber?: string;
  /** Business of the day as the court recorded it on eCourts. */
  courtBusiness?: string;
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
  petitioner?: string;
  respondent?: string;
  oppositeCounsel?: string;
  clientIds: string[];
  stage?: string;
  nextHearingDate?: ISODate;
  nextHearingPurpose?: string;
  filingNumber?: string;
  ecourtsStatus?: string;
  /** Set when the details came from eCourts. */
  ecourtsSyncedAt?: string;
  /** Past and future listing dates from eCourts, saved as the case's hearing history. */
  history?: { date: ISODate; purpose?: string; business?: string }[];
  /** Orders and judgments the court uploaded on eCourts. */
  orders?: EcourtsOrderRef[];
};

export type EcourtsOrderRef = { date: ISODate; kind: 'interim' | 'judgment'; description?: string; file: string };

/** An order or judgment of a case on eCourts, opened on demand. */
export type CaseOrder = { id: string; caseId: string; date: ISODate; kind: 'interim' | 'judgment'; description?: string; fileName: string; lastError?: string };

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
