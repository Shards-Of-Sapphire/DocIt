import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // 16-character code
  },
});

export class MailService {
  static async sendNotification(to: string, subject: string, text: string, html: string) {
    await transporter.sendMail({
      from: `"DocIt" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
  }

  static async sendCertificate(to: string, participantName: string, eventTitle: string, pdfBuffer: Buffer) {
    await transporter.sendMail({
      from: `"DocIt" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Certificate for ${eventTitle}`,
      text: `Hi ${participantName}, find your certificate for ${eventTitle} attached.`,
      attachments: [{ filename: "Certificate.pdf", content: pdfBuffer }],
    });
  }
}
