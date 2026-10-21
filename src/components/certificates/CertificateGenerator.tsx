// src/components/certificates/CertificateGenerator.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Download, Users, FileSpreadsheet, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CertificateGeneratorProps {
  eventId: string;
  eventTitle: string;
  chapterId: string;
  participantCount: number;
}

export function CertificateGenerator({
  eventId,
  eventTitle,
  chapterId,
  participantCount,
}: CertificateGeneratorProps) {
  const [csvData, setCsvData] = useState("");
  const [mode, setMode] = useState<"upload" | "manual" | "review">("upload");
  const [participants, setParticipants] = useState<Array<{name: string; email?: string}>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificates, setGeneratedCertificates] = useState<Array<{
    id: string;
    name: string;
    url: string;
  }>>([]);

  const handleCSVUpload = async () => {
    // Parse CSV and switch to review mode
    const lines = csvData.split('\n').filter(line => line.trim());
    const parsed = lines.slice(1).map(line => {
      const [name, email] = line.split(',');
      return { name: name?.trim(), email: email?.trim() };
    });
    
    setParticipants(parsed);
    setMode("review");
  };

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/events/${eventId}/certificates/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants, skipReview: true }),
      });
      
      const result = await response.json();
      
      if (result.status === "COMPLETED") {
        setGeneratedCertificates(result.results.map((r: any) => ({
          id: r.certificateId,
          name: r.participantName,
          url: r.downloadUrl,
        })));
        
        // Trigger audit log and notification
      }
    } catch (error) {
      console.error("Bulk generation failed:", error);
      alert("Failed to generate certificates");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Certificate Generation
          </CardTitle>
          <CardDescription>
            Generate certificates for all event participants at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-4">
            <Button
              variant={mode === "upload" ? "default" : "outline"}
              onClick={() => setMode("upload")}
            >
              Upload CSV
            </Button>
            <Button
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
              disabled={true} // Manual input TBD
            >
              Add Manually
            </Button>
          </div>

          {/* CSV Upload */}
          {mode === "upload" && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium">Upload Participant List</h4>
                <p className="mb-3 text-sm text-gray-600">
                  Upload a CSV file with columns: Name, Email (optional)
                </p>
                <Textarea
                  placeholder="John Doe,john@example.com\nJane Smith,jane@example.com"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCSVUpload}>
                  Review Participants
                </Button>
              </div>
            </div>
          )}

          {/* Review Mode */}
          {mode === "review" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Participant Review</h4>
                    <p className="text-sm text-gray-600">
                      Review names before generating certificates
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {participants.length} participants
                  </Badge>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Name</th>
                      <th className="p-3 text-left text-sm font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">{p.name}</td>
                        <td className="p-3 text-gray-600">{p.email || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setMode("upload")}
                >
                  Back to Edit
                </Button>
                <Button
                  onClick={handleBulkGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate Certificates"}
                </Button>
              </div>
            </div>
          )}

          {/* Results */}
          {generatedCertificates.length > 0 && (
            <div className="space-y-4 rounded-lg border bg-green-50 p-4">
              <h4 className="font-semibold text-green-800">Certificates Generated!</h4>
              <div className="space-y-2">
                {generatedCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between rounded bg-white p-3"
                  >
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-sm text-gray-600">ID: {cert.id}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(cert.url, "_blank")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant="outline">
                  Download All as ZIP
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Certificate Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Individual Certificates
          </CardTitle>
          <CardDescription>
            Generate certificates for individual participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600">
            Total participants: {participantCount} (imported from registration)
          </p>
          <Button variant="outline">
            Generate for All Participants
          </Button>
        </CardContent>
      </Card>

      {/* Certificate Verification Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Certificate Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            All certificates include a unique verification URL and QR code.
            Share this page with participants:
          </p>
          <code className="block rounded bg-gray-100 p-3 text-sm">
            {`${process.env.NEXT_PUBLIC_APP_URL}/certificates/verify/{id}`}
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
