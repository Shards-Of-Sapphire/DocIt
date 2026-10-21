// src/server/services/approval.service.ts
import { db } from "@/lib/db";
import { requireAction } from "./permissions.service";
import { audit } from "./audit.service";
import { ApprovalDecision, DocumentStatus } from "@prisma/client";
import { z } from "zod";
import { Role } from "@prisma/client";

export const submitForApprovalInput = z.object({
  versionId: z.string(),
  comment: z.string().optional(),
});

export const approveDecisionInput = z.object({
  versionId: z.string(),
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  comment: z.string().optional(),
});

interface ApprovalStep {
  role: Role; // "ADVISOR", "CHAIR"
  sequence: number;
}

// Chapter-specific approval policies
const APPROVAL_POLICIES: Record<string, ApprovalStep[]> = {
  PROPOSAL: [{ role: "CHAIR", sequence: 0 }],
  PERMISSION_LETTER: [{ role: "CHAIR", sequence: 0 }],
  BUDGET_SHEET: [{ role: "CHAIR", sequence: 0 }],
  REPORT: [{ role: "CHAIR", sequence: 0 }],
  ANNUAL_SUMMARY: [{ role: "CHAIR", sequence: 0 }],
};


export class ApprovalWorkflow {
  /**
   * Submit a document version for approval
   */
  static async submit(versionId: string, userId: string, comment?: string) {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: {
          include: { event: { include: { chapter: true } } },
        },
      },
    });

    if (!version) throw new Error("Version not found");
    
    // Only creator can submit
    if (version.createdBy !== userId) {
      await requireAction(version.document.event.chapterId, "document:submit");
    }

    // Check if already submitted
    if (version.status !== "DRAFT") {
      throw new Error("Document already submitted");
    }

    // Get approval policy for this document type
    const policy = APPROVAL_POLICIES[version.document.type] || [];

    // Create pending approval records
    const approvals = await Promise.all(
      policy.map(async (step, index) => {
        // Find eligible approvers for this role
        const approvers = await db.membership.findMany({
          where: {
            chapterId: version.document.event.chapterId,
            role: step.role as any,
            termEnd: null, // Currently active
          },
          include: { user: true },
        });

        if (approvers.length === 0) {
          console.warn(`No ${step.role} found for chapter ${version.document.event.chapterId}`);
        }

        // Create pending approval for each approver (multiple approvers can serve same role)
        return Promise.all(
          approvers.map(approver =>
            db.approval.create({
              data: {
                versionId,
                approverId: approver.user.id,
                decision: "PENDING",
                sequence: step.sequence,
              },
            })
          )
        );
      })
    );

    // Update version status
    const updatedVersion = await db.documentVersion.update({
      where: { id: versionId },
      data: {
        status: "SUBMITTED",
      },
      include: {
        approvals: true,
        document: true,
      },
    });

    await audit(userId, "document.submitted", "DocumentVersion", versionId, {
      documentType: version.document.type,
      eventId: version.document.event.id,
    });

    // TODO: Send notifications to approvers (email/Discord webhook)

    return updatedVersion;
  }

  /**
   * Approve or request changes on a document
   */
  static async decide(
    versionId: string,
    approverId: string,
    decision: ApprovalDecision,
    comment?: string
  ) {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        approvals: {
          where: { approverId },
          orderBy: { sequence: "asc" },
        },
        document: {
          include: { event: { include: { chapter: true } } },
        },
      },
    });

    if (!version) throw new Error("Version not found");
    
    await requireAction(version.document.event.chapterId, "document:approve");

    const pendingApproval = version.approvals.find(
      a => a.approverId === approverId && a.decision === "PENDING"
    );

    if (!pendingApproval) {
      throw new Error("No pending approval for this user");
    }

    // Update the specific approval
    const updatedApproval = await db.approval.update({
      where: { id: pendingApproval.id },
      data: {
        decision,
        comment,
        decidedAt: new Date(),
      },
    });

    // Check if all approvals in this sequence are complete
    const sequence = pendingApproval.sequence;
    const sequenceApprovals = await db.approval.findMany({
      where: { versionId, sequence },
    });

    const allDecided = sequenceApprovals.every(a => a.decision !== "PENDING");

    if (allDecided) {
      if (decision === "CHANGES_REQUESTED" || decision === "REJECTED") {
        // Roll back to changes requested status
        await db.documentVersion.update({
          where: { id: versionId },
          data: { status: "CHANGES_REQUESTED" },
        });
      } else if (decision === "APPROVED") {
        // Check if this was the final sequence
        const maxSequence = await db.approval.aggregate({
          where: { versionId },
          _max: { sequence: true },
        });

        if (sequence === maxSequence._max.sequence) {
          // All sequences approved - document fully approved
          await db.documentVersion.update({
            where: { id: versionId },
            data: { status: "APPROVED" },
          });
        } else {
          // Move to next sequence
          await db.documentVersion.update({
            where: { id: versionId },
            data: { status: "UNDER_REVIEW" },
          });
        }
      }
    }

    await audit(approverId, `document.${decision.toLowerCase()}`, "DocumentVersion", versionId, {
      comment,
      sequence,
    });

    // Notify document creator of decision
    // TODO: Send notification

    return updatedApproval;
  }

  /**
   * Get approval status summary
   */
  static async getStatus(versionId: string) {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        approvals: {
          include: { approver: true },
          orderBy: { sequence: "asc", decidedAt: "asc" },
        },
        document: true,
        createdByUser: { select: { name: true, email: true } },
      },
    });

    if (!version) return null;

    // Calculate progress
    const totalSteps = Math.max(...version.approvals.map(a => a.sequence)) + 1;
    const completedSteps = new Set(
      version.approvals.filter(a => a.decision !== "PENDING").map(a => a.sequence)
    ).size;

    return {
      ...version,
      progress: { completedSteps, totalSteps },
    };
  }
}
