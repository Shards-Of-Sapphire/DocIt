// src/app/api/chapters/[id]/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAction } from "@/server/services/permissions.service";
import { db } from "@/lib/db";
import { z } from "zod";

const createTemplateSchema = z.object({
  type: z.enum(["PROPOSAL", "PERMISSION_LETTER", "BUDGET_SHEET", "REPORT", "ATTENDANCE_SHEET", "MINUTES", "ANNUAL_SUMMARY"]),
  body: z.string().min(100),
  isDefault: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapterId = params.id;
    const session = await requireAction(chapterId, "chapter:manage");
    
    const body = await req.json();
    const validated = createTemplateSchema.parse(body);
    
    const template = await db.chapterTemplate.create({
      data: {
        chapterId,
        type: validated.type,
        body: validated.body,
        isDefault: validated.isDefault ?? false,
      },
    });
    
    return NextResponse.json(template);
  } catch (error) {
    console.error("Template creation error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 400 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapterId = params.id;
    await requireAction(chapterId, "event:read"); // Anyone in chapter can view templates
    
    const templates = await db.chapterTemplate.findMany({
      where: { chapterId },
      orderBy: { type: "asc" },
    });
    
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 403 }
    );
  }
}
