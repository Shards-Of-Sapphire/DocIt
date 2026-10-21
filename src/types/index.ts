export type EventType =
  | "WORKSHOP"
  | "SEMINAR"
  | "FEST"
  | "COMPETITION"
  | "MEETING"
  | "GUEST_LECTURE"
  | "SOCIAL"
  | "OTHER";

export type EventStatus = "PLANNED" | "LIVE" | "COMPLETED" | "REPORTED" | "ARCHIVED";

export type DocumentType =
  | "PROPOSAL"
  | "PERMISSION_LETTER"
  | "BUDGET_SHEET"
  | "REPORT"
  | "ATTENDANCE_SHEET"
  | "MINUTES"
  | "ANNUAL_SUMMARY";

export type Role = "CHAIR" | "DOCS" | "CONTRIBUTOR" | "VIEWER";

export interface Event {
  id: string;
  chapterId: string;
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt: Date;
  venue?: string;
  status: EventStatus;
  objectives?: string;
  outcomes?: string;
  participantCount?: number;
  tags: string[];
  createdAt: Date;
}

export interface Speaker {
  id: string;
  eventId: string;
  name: string;
  designation?: string;
  bio?: string;
  photoKey?: string;
}

export interface BudgetLine {
  id: string;
  eventId: string;
  item: string;
  amount: number;
  notes?: string;
}

export interface Chapter {
  id: string;
  name: string;
  parentBody: string;
  academicYear: string;
  createdAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  chapterId: string;
  role: Role;
  termStart: Date;
  termEnd?: Date;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  createdAt: Date;
}
