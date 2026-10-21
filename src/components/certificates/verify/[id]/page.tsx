// src/app/certificates/verify/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { CertificateService } from "@/server/services/certificate.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Download, Share } from "lucide-react";

export default async function CertificateVerificationPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await CertificateService.verify(params.id);

  if (!result.valid) {
    return (
      <div className="container mx-auto py-16 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Certificate Not Found</h1>
        <p className="text-gray-600 mb-6">{result.message}</p>
        <p className="text-sm text-gray-500">
          Check the certificate ID and try again, or contact the event organizer.
        </p>
      </div>
    );
  }

  const { certificate } = result;

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <CardTitle>Certificate Verified</CardTitle>
              <p className="text-sm text-gray-600">
                This certificate is valid and issued by {certificate.chapter}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Certificate Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Participant</p>
                <p className="font-semibold">{certificate.participantName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Event</p>
                <p className="font-semibold">{certificate.eventTitle}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Event Date</p>
                <p className="font-semibold">
                  {new Date(certificate.eventDate).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Issued On</p>
                <p className="font-semibold">
                  {new Date(certificate.issuedAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
            
            {/* Certificate ID */}
            <div className="rounded-lg bg-gray-100 p-4">
              <p className="text-sm text-gray-500">Certificate ID</p>
              <p className="font-mono font-bold text-lg">{certificate.id}</p>
            </div>

            {/* QR Code Placeholder */}
            <div className="flex justify-center">
              <div className="rounded-lg border bg-white p-4">
                <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                  <p className="text-gray-500">QR Code</p>
                </div>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Scan to verify authenticity
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button variant="outline">
              <Share className="mr-2 h-4 w-4" />
              Share Verification
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download Certificate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <p className="mt-8 text-center text-sm text-gray-500">
        This verification is powered by DocIt • {new Date().getFullYear()}
      </p>
    </div>
  );
}
