import { z } from "zod";

export const createEventSchema = z.object({
  chapterId: z.string().min(1),
  title: z.string().min(3).max(200),
  type: z.enum(["WORKSHOP", "SEMINAR", "FEST", "COMPETITION", "MEETING", "GUEST_LECTURE", "SOCIAL", "OTHER"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  venue: z.string().max(300).optional(),
  objectives: z.string().max(2000).optional(),
  outcomes: z.string().max(2000).optional(),
  participantCount: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  speakers: z.array(z.object({
    name: z.string().min(1).max(200),
    designation: z.string().max(200).optional(),
    bio: z.string().max(2000).optional(),
  })).max(50).optional(),
    budgetLines: z.array(z.object({
    item: z.string().min(1).max(200),
    amount: z.number().nonnegative().multipleOf(0.01).max(99_99_99_999.99), // rupees, 2 decimals
    notes: z.string().max(1000).optional(),
  })).max(100).optional(),
}).refine(d => d.endsAt > d.startsAt, {
  message: "End time must be after start time",
  path: ["endsAt"],
});

export const createChapterSchema = z.object({
  name: z.string().min(3).max(200),
  parentBody: z.string().min(3).max(200),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/),
});

export const createMembershipSchema = z.object({
  userId: z.string().min(1),
  chapterId: z.string().min(1),
  role: z.enum(["CHAIR", "DOCS", "CONTRIBUTOR", "VIEWER"]),
});

export const createDocumentSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum(["PROPOSAL", "PERMISSION_LETTER", "BUDGET_SHEET", "REPORT", "ATTENDANCE_SHEET", "MINUTES", "ANNUAL_SUMMARY"]),
});

export const createCertificateSchema = z.object({
  eventId: z.string().min(1),
  participantId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
});
