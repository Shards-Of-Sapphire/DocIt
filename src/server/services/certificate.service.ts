// src/server/services/certificate.service.ts
import { db } from "@/lib/db";
import { requireAction } from "./permissions.service";
import { audit } from "./audit.service";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import QRCode from "qrcode";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export interface CertificateData {
  participantName: string;
  eventTitle: string;
  eventDate: string;
  certificateId: string;
  verificationUrl: string;
}

export class CertificateService {
  /**
   * Generate single certificate
   */
  static async generateSingle(
    eventId: string,
    participantId: string,
    userId: string,
    template?: string
  ) {
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { chapter: true },
    });

    if (!event) throw new Error("Event not found");
    
    await requireAction(event.chapterId, "certificate:generate");

    const participant = await db.participant.findUnique({
      where: { id: participantId },
    });

    if (!participant) throw new Error("Participant not found");

    // Generate unique certificate ID
    const certificateId = crypto.randomBytes(8).toString("hex").toUpperCase();
    
    // Create verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL}/certificates/verify/${certificateId}`;
    
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

    // Prepare certificate data
    const data: CertificateData = {
      participantName: participant.name,
      eventTitle: event.title,
      eventDate: event.startsAt.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      certificateId,
      verificationUrl,
    };

    // Generate certificate document
    const certificateBuffer = await this.generateCertificateDocument(data, template || event.chapterId);
    
    // Upload to S3
    const fileKey = `certificates/${event.chapterId}/${eventId}/${certificateId}.pdf`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: fileKey,
        Body: certificateBuffer,
        ContentType: "application/pdf",
        Metadata: {
          "event-id": eventId,
          "participant-id": participantId,
          "certificate-id": certificateId,
        },
      })
    );

    // Create certificate record
    const certificate = await db.certificate.create({
      data: {
        eventId,
        participantId: participant.id,
        serial: certificateId,
        fileKey,
        issuedAt: new Date(),
      },
    });

    await audit(userId, "certificate.generated", "Certificate", certificate.id, {
      eventId,
      participantName: participant.name,
      certificateId,
    });

    return {
      certificateId,
      fileKey,
      downloadUrl: await this.generateSignedUrl(fileKey),
      participantName: participant.name,
    };
  }

  /**
   * Bulk generate certificates from participant CSV
   */
  static async bulkGenerate(
    eventId: string,
    csvData: string,
    userId: string,
    skipReview = false
  ) {
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { chapter: true },
    });

    if (!event) throw new Error("Event not found");
    
    await requireAction(event.chapterId, "certificate:generate");

    // Parse CSV
    const participants = this.parseCSV(csvData);
    
    if (!skipReview) {
      // Return for review before generation
      return {
        status: "REVIEW_REQUIRED",
        participants,
        total: participants.length,
        preview: participants.slice(0, 5),
        errors: this.validateParticipants(participants),
      };
    }

    // Bulk generation
    const results = [];
    const errors = [];

    for (const participant of participants) {
      try {
        // Create participant record
        const participantRecord = await db.participant.create({
          data: {
            eventId,
            name: participant.name,
            email: participant.email,
            attended: true,
          },
        });

        // Generate certificate
        const result = await this.generateSingle(eventId, participantRecord.id, userId);
        results.push(result);
      } catch (error) {
        errors.push({
          participant,
          error: error.message,
        });
      }
    }

    await audit(userId, "certificate.bulk_generated", "Event", eventId, {
      total: participants.length,
      successful: results.length,
      failed: errors.length,
    });

    return {
      status: "COMPLETED",
      results,
      errors,
      summary: {
        total: participants.length,
        successful: results.length,
        failed: errors.length,
      },
    };
  }

  /**
   * Generate certificate document from template
   */
  private static async generateCertificateDocument(
    data: CertificateData,
    templateIdentifier: string
  ): Promise<Buffer> {
    // Load template (chapter-specific or default)
    let template: Buffer;
    
    try {
      // Try chapter-specific template
      template = await this.loadTemplate(`${templateIdentifier}/certificate`);
    } catch {
      // Fallback to default template
      template = await this.loadTemplate("default/certificate");
    }

    // Use docxtemplater to populate template
    const zip = new PizZip(template);
    const doc = new Docxtemplater(zip);
    
    doc.setData({
      ...data,
      qrCode: "data:image/png;base64,...", // Base64 QR code image
      generatedDate: new Date().toLocaleDateString("en-IN"),
    });
    
    doc.render();
    
    // Convert to PDF (simplified - in production use docx-to-pdf library)
    return Buffer.from(doc.getZip().generate({ type: "nodebuffer" }));
  }

  /**
   * Verify certificate by ID
   */
  static async verify(certificateId: string) {
    const certificate = await db.certificate.findUnique({
      where: { serial: certificateId },
      include: {
        event: {
          include: { chapter: true },
        },
        participant: true,
      },
    });

    if (!certificate) {
      return {
        valid: false,
        message: "Certificate not found",
      };
    }

    return {
      valid: true,
      certificate: {
        id: certificate.serial,
        participantName: certificate.participant?.name,
        eventTitle: certificate.event.title,
        eventDate: certificate.event.startsAt,
        issuedAt: certificate.issuedAt,
        chapter: certificate.event.chapter.name,
        verificationUrl: `${process.env.NEXTAUTH_URL}/certificates/verify/${certificateId}`,
      },
    };
  }

  /**
   * Helper: Generate signed URL for download
   */
  private static async generateSignedUrl(fileKey: string, expiresIn = 3600) {
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
    });
    
    return getSignedUrl(s3Client, command, { expiresIn });
  }

  private static parseCSV(csv: string): Array<{ name: string; email?: string }> {
    // Simple CSV parser - implement properly in production
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        name: values[0]?.trim(),
        email: values[1]?.trim(),
      };
    }).filter(p => p.name);
  }

  private static validateParticipants(participants: Array<{ name: string }>) {
    const errors = [];
    
    for (let i = 0; i < participants.length; i++) {
      if (!participants[i].name || participants[i].name.trim().length < 2) {
        errors.push(`Row ${i + 2}: Name is required`);
      }
      if (participants[i].name.length > 100) {
        errors.push(`Row ${i + 2}: Name too long`);
      }
    }
    
    return errors;
  }

  private static async loadTemplate(id: string): Promise<Buffer> {
    // Load template from filesystem or database
    // For now, return mock
    const mockTemplate = `
      <html>
        <body>
          <h1>Certificate of Participation</h1>
          <p>This certifies that {{participantName}}</p>
          <p>participated in {{eventTitle}} on {{eventDate}}</p>
          <p>Certificate ID: {{certificateId}}</p>
          <img src="{{qrCode}}" alt="Verification QR" />
          <p>Verify at: {{verificationUrl}}</p>
        </body>
      </html>
    `;
    return Buffer.from(mockTemplate);
  }
}
