"use client";
import { useState } from "react";
import { createEvent } from "@/server/actions/events";

export function EventForm({
  chapterId,
  initialEvent,
}: {
  chapterId: string;
  initialEvent?: any;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        // TODO: implement form submission
      }}
      className="space-y-6"
    >
      <input type="hidden" name="chapterId" value={chapterId} />
      {/* Fields TBD in Phase 4+ */}
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Saving..." : "Save event"}
      </button>
    </form>
  );
}
