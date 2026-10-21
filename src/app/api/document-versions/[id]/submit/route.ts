// src/app/api/document-versions/[id]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitForApprovalInput } from "@/server/services/approval.service";
import { ApprovalWorkflow } from "@/server/services/approval.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { comment } = submitForApprovalInput.parse(body);

    const result = await ApprovalWorkflow.submit(
      params.id,
      session.user.id,
      comment
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit" },
      { status: 400 }
    );
  }
}

// src/app/api/document-versions/[id]/approve/route.ts
import { approveDecisionInput } from "@/server/services/approval.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { decision, comment } = approveDecisionInput.parse(body);

    const result = await ApprovalWorkflow.decide(
      params.id,
      session.user.id,
      decision,
      comment
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Approval error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve" },
      { status: 400 }
    );
  }
}

// src/app/api/events/[id]/certificates/bulk/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { participants, skipReview } = body;

    const result = await CertificateService.bulkGenerate(
      params.id,
      participants,
      session.user.id,
      skipReview
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Certificate generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate certificates" },
      { status: 400 }
    );
  }
}
