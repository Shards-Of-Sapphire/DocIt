export const EVENT_TYPES = [
  "WORKSHOP",
  "SEMINAR",
  "FEST",
  "COMPETITION",
  "MEETING",
  "GUEST_LECTURE",
  "SOCIAL",
  "OTHER",
] as const;

export const EVENT_STATUSES = ["PLANNED", "LIVE", "COMPLETED", "REPORTED", "ARCHIVED"] as const;

export const DOCUMENT_TYPES = [
  { id: "PROPOSAL", label: "Event proposal" },
  { id: "PERMISSION_LETTER", label: "Permission letter" },
  { id: "BUDGET_SHEET", label: "Budget sheet" },
  { id: "REPORT", label: "Post-event report" },
  { id: "ATTENDANCE_SHEET", label: "Attendance sheet" },
  { id: "MINUTES", label: "Minutes" },
  { id: "ANNUAL_SUMMARY", label: "Annual summary" },
] as const;

export const NEXT_ACTION: Record<(typeof EVENT_STATUSES)[number], string> = {
  PLANNED: "Complete the event details and generate the proposal.",
  LIVE: "Record attendance and generate the attendance sheet.",
  COMPLETED: "Generate the post-event report and certificates.",
  REPORTED: "Send the report for approval, or archive the event.",
  ARCHIVED: "No action needed. This event is archived.",
};
