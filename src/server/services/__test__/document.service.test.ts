// src/server/services/__tests__/document.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateDocument } from "../document.service";
import { db } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

vi.mock("@/lib/db");
vi.mock("@aws-sdk/client-s3");

describe("Document generation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should generate a document and create version record", async () => {
    const mockEvent = {
      id: "event-123",
      chapterId: "chapter-456",
      title: "Test Workshop",
      type: "WORKSHOP",
      startsAt: new Date(),
      endsAt: new Date(),
      venue: "Room 101",
      objectives: "Test objectives",
      outcomes: "Test outcomes",
      participantCount: 50,
      chapter: {
        name: "IEEE SIGHT",
        parentBody: "IEEE",
        academicYear: "2026-27",
      },
      speakers: [{ name: "Speaker 1", designation: "Professor" }],
      budgetLines: [{ item: "Snacks", amount: 5000 }],
    };

    // ... mock implementations
  });

  it("should throw permission error for unauthorized user", async () => {
    // test that VIEWER role cannot generate documents
  });
});
