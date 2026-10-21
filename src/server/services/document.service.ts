\import { db } from "@/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { audit } from "./audit.service";
import { MailService } from "./mail.service";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export class DocumentService {
  static async generate(eventId: string, type: string, userId: string) {
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { chapter: true, speakers: true, budgetLines: true },
    });
    if (!event) throw new Error("Event not found");

    // 1. Fetch template from R2 or local filesystem (implementation specific)
    // For now, using a placeholder logic for the docxtemplater process
    const content = await fetchTemplate(type); // Mock fetch
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.render({
      title: event.title,
      date: event.startsAt.toDateString(),
      chapter: event.chapter.name,
      budget: event.budgetLines.map(b => ({ item: b.item, amount: Number(b.amount) })),
      total: event.budgetLines.reduce((sum, b) => sum + Number(b.amount), 0)
    });

    const buf = doc.getZip().generate({ type: "nodebuffer" });
    const key = `docs/${eventId}/${type}_${Date.now()}.docx`;

    // 2. Upload to Cloudflare R2
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buf,
      ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }));

    // 3. Save to DB
    const docRecord = await db.document.upsert({
      where: { eventId_type: { eventId, type: type as any } },
      update: {},
      create: { eventId, type: type as any, chapterId: event.chapterId }
    });

    const version = await db.documentVersion.create({
      data: { documentId: docRecord.id, storageKey: key, status: "PENDING", generatedById: userId }
    });

    // 4. Notify Chair
    const chair = await db.membership.findFirst({ where: { chapterId: event.chapterId, role: "CHAIR" }, include: { user: true } });
    if (chair?.user.email) {
      await MailService.sendNotification(
        chair.user.email,
        "New Document for Approval",
        `A new ${type} for "${event.title}" is waiting for your approval.`,
        `<p>A new <b>${type}</b> for "${event.title}" is waiting for your approval.</p>`
      );
    }

    await audit(userId, "document.generated", "Document", version.id);
    return version;
  }
}

async function fetchTemplate(type: string): Promise<Buffer> {
  // Logic to load local template files from src/assets/templates/
  return Buffer.from([]); // Placeholder
}
