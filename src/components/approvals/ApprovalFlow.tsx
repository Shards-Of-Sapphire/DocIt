// src/components/approvals/ApprovalFlow.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Send, 
  Users,
  FileText
} from "lucide-react";

interface ApprovalStep {
  id: string;
  sequence: number;
  approverName: string;
  role: string;
  decision: "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  comment?: string;
  decidedAt?: Date;
}

interface ApprovalFlowProps {
  versionId: string;
  steps: ApprovalStep[];
  currentUserRole: string;
  currentUserCanApprove: boolean;
  onSubmit: () => Promise<void>;
  onApprove: (comment: string) => Promise<void>;
  onRequestChanges: (comment: string) => Promise<void>;
}

export function ApprovalFlow({
  versionId,
  steps,
  currentUserRole,
  currentUserCanApprove,
  onSubmit,
  onApprove,
  onRequestChanges,
}: ApprovalFlowProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit();
    setIsSubmitting(false);
  };

  const getStepIcon = (decision: string) => {
    switch (decision) {
      case "APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "CHANGES_REQUESTED":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatusColor = (decision: string) => {
    switch (decision) {
      case "APPROVED": return "bg-green-100 text-green-800";
      case "CHANGES_REQUESTED": return "bg-yellow-100 text-yellow-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Group steps by sequence
  const stepsBySequence = steps.reduce((acc, step) => {
    if (!acc[step.sequence]) {
      acc[step.sequence] = [];
    }
    acc[step.sequence].push(step);
    return acc;
  }, {} as Record<number, ApprovalStep[]>);

  const currentUserPendingSteps = steps.filter(
    step => step.decision === "PENDING" && step.role === currentUserRole
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Approval Workflow
        </CardTitle>
        <CardDescription>
          Track document approval status and provide feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Approval Steps Visualization */}
        <div className="space-y-4">
          {Object.entries(stepsBySequence).map(([sequence, sequenceSteps]) => (
            <div key={sequence} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm font-semibold text-blue-600">
                    {parseInt(sequence) + 1}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold">
                    {sequenceSteps[0].role} Approval
                  </h4>
                  <p className="text-sm text-gray-600">
                    {sequenceSteps.length} approver{sequenceSteps.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              
              <div className="ml-10 space-y-2">
                {sequenceSteps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-start gap-3">
                      {getStepIcon(step.decision)}
                      <div>
                        <p className="font-medium">{step.approverName}</p>
                        <Badge variant="outline" className={getStepStatusColor(step.decision)}>
                          {step.decision.replace("_", " ")}
                        </Badge>
                        {step.comment && (
                          <p className="mt-1 text-sm text-gray-600">{step.comment}</p>
                        )}
                        {step.decidedAt && (
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(step.decidedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {step.decision === "PENDING" && 
                     step.role === currentUserRole && 
                     currentUserCanApprove && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRequestChanges("")}
                        >
                          Request Changes
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onApprove("")}
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Action Section */}
        {currentUserPendingSteps.length > 0 && currentUserCanApprove && (
          <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
            <h3 className="font-semibold">Your Approval Required</h3>
            <Textarea
              placeholder="Add comments for the document creator..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => onRequestChanges(comment)}
                disabled={isSubmitting}
              >
                Request Changes
              </Button>
              <Button
                onClick={() => onApprove(comment)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Approve"}
              </Button>
            </div>
          </div>
        )}

        {/* Submit for Approval Button */}
        {steps.every(s => s.decision === "PENDING") && (
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
