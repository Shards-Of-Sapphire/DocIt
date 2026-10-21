// src/components/documents/DocumentGenerator.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Eye } from "lucide-react";

const DOCUMENT_TYPES = [
  { id: "PROPOSAL", label: "Event Proposal", description: "Formal proposal document" },
  { id: "PERMISSION_LETTER", label: "Permission Letter", description: "Request for venue/approval" },
  { id: "BUDGET_SHEET", label: "Budget Sheet", description: "Budget breakdown and approval" },
  { id: "REPORT", label: "Post-event Report", description: "Detailed event report" },
  { id: "ATTENDANCE_SHEET", label: "Attendance Sheet", description: "Participant attendance record" },
  { id: "MINUTES", label: "Meeting Minutes", description: "Official meeting minutes" },
  { id: "ANNUAL_SUMMARY", label: "Annual Summary", description: "Year-end activity summary" },
];

interface DocumentGeneratorProps {
  eventId: string;
  eventTitle: string;
  chapterId: string;
}

export function DocumentGenerator({ eventId, eventTitle, chapterId }: DocumentGeneratorProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  const handleGenerate = async (docType: string) => {
    setGenerating(docType);
    try {
      const response = await fetch(`/api/events/${eventId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: docType }),
      });
      
      if (!response.ok) throw new Error("Generation failed");
      
      const data = await response.json();
      
      // Preview the generated document
      setPreviewUrl(data.previewUrl);
      setPreviewType(docType);
    } catch (error) {
      console.error("Generation error:", error);
      alert(`Failed to generate ${docType}`);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Documents</CardTitle>
          <CardDescription>
            Generate documents for "{eventTitle}". Documents are created from templates using event data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOCUMENT_TYPES.map((doc) => (
              <Card key={doc.id} className="relative">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold">{doc.label}</h3>
                    <p className="text-sm text-gray-600">{doc.description}</p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => handleGenerate(doc.id)}
                        disabled={generating === doc.id}
                      >
                        {generating === doc.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Generate
                          </>
                        )}
                      </Button>
                      {previewType === doc.id && previewUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(previewUrl, "_blank")}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Management Card */}
      <Card>
        <CardHeader>
          <CardTitle>Template Management</CardTitle>
          <CardDescription>
            Customize templates for your chapter. Default templates are provided.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => window.open(`/settings/templates/${chapterId}`, "_blank")}
          >
            Manage Templates
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
