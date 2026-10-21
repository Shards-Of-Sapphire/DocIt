// src/server/services/document.service.ts
import { db } from "@/lib/db";
import { requireAction } from "@/server/services/permissions.service";
import { audit } from "@/server/services/audit.service";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { Readable } from "stream";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export type DocumentType = 
  | "PROPOSAL" 
  | "PERMISSION_LETTER" 
  | "BUDGET_SHEET" 
  | "REPORT" 
  | "ATTENDANCE_SHEET" 
  | "MINUTES" 
  | "ANNUAL_SUMMARY";

export interface MergeData {
  event: {
    title: string;
    type: string;
    startsAt: string;
    endsAt: string;
    venue?: string;
    objectives?: string;
    outcomes?: string;
    participantCount?: number;
  };
  chapter: {
    name: string;
    parentBody: string;
    academicYear: string;
  };
  speakers: Array<{
    name: string;
    designation?: string;
    bio?: string;
  }>;
  budgetLines: Array<{
    item: string;
    amount: number;
    notes?: string;
  }>;
  // Custom chapter fields
  [key: string]: any;
}

/**
 * Generate document from template using docxtemplater
 */
export async function generateDocument(
  eventId: string,
  docType: DocumentType,
  userId: string,
  customData?: Record<string, any>
): Promise<{ versionId: string; fileKey: string; previewUrl: string }> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      chapter: true,
      speakers: true,
      budgetLines: true,
    },
  });
  
  if (!event) throw new Error("Event not found");

  // Check permissions
  await requireAction(event.chapterId, 
    docType === "PERMISSION_LETTER" ? "document:create" : "document:create"
  );

  // Get template (chapter-specific first, then fallback)
  const template = await db.chapterTemplate.findFirst({
    where: { 
      chapterId: event.chapterId, 
      type: docType 
    },
  }) || await getDefaultTemplate(docType);

  // Prepare merge data
  const mergeData: MergeData = {
    event: {
      title: event.title,
      type: event.type,
      startsAt: event.startsAt.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      endsAt: event.endsAt.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      venue: event.venue || "",
      objectives: event.objectives || "",
      outcomes: event.outcomes || "",
      participantCount: event.participantCount,
    },
    chapter: {
      name: event.chapter.name,
      parentBody: event.chapter.parentBody,
      academicYear: event.chapter.academicYear,
    },
    speakers: event.speakers.map(s => ({
      name: s.name,
      designation: s.designation || "",
      bio: s.bio || "",
    })),
    budgetLines: event.budgetLines.map(b => ({
      item: b.item,
      amount: b.amount,
      notes: b.notes || "",
    })),
    // Add chapter-specific custom fields
    ...customData,
  };

  // Generate DOCX
  const zip = new PizZip(template.body as any);
  const doc = new Docxtemplater(zip);
  
  doc.setData(mergeData);
  
  try {
    doc.render();
  } catch (error) {
    console.error("Template rendering error:", error);
    throw new Error(`Template error: ${error.message}`);
  }

  const buffer = doc.getZip().generate({ type: "nodebuffer" });
  
  // Upload to S3/R2
  const fileKey = `documents/${event.chapterId}/${eventId}/${docType}-${Date.now()}.docx`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
      Body: buffer,
      ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Metadata: {
        "event-id": eventId,
        "doc-type": docType,
        "generated-by": userId,
      },
    })
  );

  // Create document record
  const document = await db.document.upsert({
    where: { eventId_type: { eventId, type: docType } },
    update: {},
    create: {
      eventId,
      type: docType,
    },
  });

  const version = await db.documentVersion.create({
    data: {
      documentId: document.id,
      fileKey,
      createdBy: userId,
      status: "DRAFT",
    },
  });

  await db.document.update({
    where: { id: document.id },
    data: { currentVersionId: version.id },
  });

  // Generate signed URL for preview/download (expires in 1 hour)
  const previewUrl = await generateSignedUrl(fileKey, 3600);

  await audit(userId, "document.generated", "DocumentVersion", version.id, {
    eventId,
    docType,
    fileKey,
  });

  return { versionId: version.id, fileKey, previewUrl };
}

/**
 * Convert DOCX to PDF preview (using preview service)
 */
export async function generatePDFPreview(fileKey: string): Promise<{ pdfKey: string; previewUrl: string }> {
  // This would integrate with a PDF conversion service
  // For now, we'll mock it by returning a PDF version
  throw new Error("PDF conversion not implemented in Phase 2");
}

/**
 * Generate signed URL for file access
 */
async function generateSignedUrl(fileKey: string, expiresIn: number): Promise<string> {
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Default templates for each document type
 */
async function getDefaultTemplate(docType: DocumentType): Promise<{ body: Buffer }> {
  // In production, these would be loaded from file system
  const templates = {
    PROPOSAL: "Proposal for {{event.title}}...",
    PERMISSION_LETTER: "Permission Letter for {{event.title}}...",
    REPORT: "Post-event Report for {{event.title}}...",
    // etc.
  };
  
  return {
    body: Buffer.from(templates[docType] || "", "utf-8"),
  };
}
