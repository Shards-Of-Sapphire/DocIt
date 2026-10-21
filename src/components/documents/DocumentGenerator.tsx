"use client";
import { useState } from "react";
import { DOCUMENT_TYPES } from "@/app/_lib/event-helpers";

export function DocumentGenerator({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  const generate = async (type: string) => {
    setLoading(type);
    try {
      const res = await fetch(`/api/events/${eventId}/documents`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      if (res.ok) window.location.reload();
    } catch (err) {
      alert("Failed to generate document");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header"><h2 className="card-title">Generate Documents</h2></div>
      <div className="card-content space-y-2">
        {DOCUMENT_TYPES.map((doc) => (
          <button
            key={doc.id}
            disabled={!!loading}
            onClick={() => generate(doc.id)}
            className="btn btn-secondary w-full justify-start text-left"
          >
            {loading === doc.id ? "Generating..." : `Generate ${doc.label}`}
          </button>
        ))}
      </div>
    </div>
  );
}
