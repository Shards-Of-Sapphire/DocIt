"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { BudgetLine, Event, Speaker } from "@prisma/client";
import { EVENT_TYPES } from "@/app/_lib/event-helpers";
import {
  createEventAction,
  updateEventAction,
  type EventFormState,
} from "@/server/actions/events";

type SpeakerRow = { name: string; designation: string; bio: string };
type BudgetRow = { item: string; amount: string; notes: string };

type Props = {
  chapterId?: string; // accepted for compatibility; the server uses the active chapter
  initialEvent?: Event & { speakers: Speaker[]; budgetLines: BudgetLine[] };
};

/** Show a UTC date as an IST value for datetime-local inputs. */
function toIstInput(d: Date) {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16);
}

function labelFor(type: string) {
  const s = type.replace("_", " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Saving..." : label}
    </button>
  );
}

export function EventForm({ initialEvent }: Props) {
  const isEdit = Boolean(initialEvent);

  const action: (prev: EventFormState, fd: FormData) => Promise<EventFormState> = initialEvent
    ? updateEventAction.bind(null, initialEvent.id)
    : createEventAction;

  const [state, formAction] = useFormState<EventFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  const [speakers, setSpeakers] = useState<SpeakerRow[]>(
    () =>
      initialEvent?.speakers.map((s) => ({
        name: s.name,
        designation: s.designation ?? "",
        bio: s.bio ?? "",
      })) ?? []
  );

  const [budgetLines, setBudgetLines] = useState<BudgetRow[]>(
    () =>
      initialEvent?.budgetLines.map((b) => ({
        item: b.item,
        amount: String(b.amount),
        notes: b.notes ?? "",
      })) ?? []
  );

  const total = budgetLines.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const updateSpeaker = (i: number, field: keyof SpeakerRow, value: string) =>
    setSpeakers((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const updateBudget = (i: number, field: keyof BudgetRow, value: string) =>
    setBudgetLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Basics */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Basics</h2>
        </div>
        <div className="card-content space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">Title</label>
            <input
              id="title"
              name="title"
              required
              minLength={3}
              maxLength={200}
              defaultValue={initialEvent?.title ?? ""}
              className="input mt-1"
            />
            <FieldError message={errors.title} />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium">Type</label>
            <select
              id="type"
              name="type"
              required
              defaultValue={initialEvent?.type ?? "WORKSHOP"}
              className="input mt-1"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{labelFor(t)}</option>
              ))}
            </select>
            <FieldError message={errors.type} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startsAt" className="block text-sm font-medium">Starts (IST)</label>
              <input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={initialEvent ? toIstInput(initialEvent.startsAt) : ""}
                className="input mt-1"
              />
              <FieldError message={errors.startsAt} />
            </div>
            <div>
              <label htmlFor="endsAt" className="block text-sm font-medium">Ends (IST)</label>
              <input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={initialEvent ? toIstInput(initialEvent.endsAt) : ""}
                className="input mt-1"
              />
              <FieldError message={errors.endsAt} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="venue" className="block text-sm font-medium">Venue</label>
              <input
                id="venue"
                name="venue"
                maxLength={300}
                defaultValue={initialEvent?.venue ?? ""}
                className="input mt-1"
              />
              <FieldError message={errors.venue} />
            </div>
            <div>
              <label htmlFor="participantCount" className="block text-sm font-medium">
                Expected participants
              </label>
              <input
                id="participantCount"
                name="participantCount"
                type="number"
                min={0}
                step={1}
                defaultValue={initialEvent?.participantCount ?? ""}
                className="input mt-1"
              />
              <FieldError message={errors.participantCount} />
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium">Tags</label>
            <input
              id="tags"
              name="tags"
              placeholder="comma, separated"
              defaultValue={initialEvent?.tags.join(", ") ?? ""}
              className="input mt-1"
            />
            <FieldError message={errors.tags} />
          </div>
        </div>
      </section>

      {/* Objectives and outcomes */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Objectives and outcomes</h2>
        </div>
        <div className="card-content space-y-4">
          <div>
            <label htmlFor="objectives" className="block text-sm font-medium">Objectives</label>
            <textarea
              id="objectives"
              name="objectives"
              rows={3}
              maxLength={2000}
              defaultValue={initialEvent?.objectives ?? ""}
              className="input mt-1"
            />
            <FieldError message={errors.objectives} />
          </div>
          <div>
            <label htmlFor="outcomes" className="block text-sm font-medium">Outcomes</label>
            <textarea
              id="outcomes"
              name="outcomes"
              rows={3}
              maxLength={2000}
              defaultValue={initialEvent?.outcomes ?? ""}
              className="input mt-1"
            />
            <FieldError message={errors.outcomes} />
          </div>
        </div>
      </section>

      {/* Speakers */}
      <section className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="card-title">Speakers</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSpeakers((r) => [...r, { name: "", designation: "", bio: "" }])}
          >
            + Add speaker
          </button>
        </div>
        <div className="card-content space-y-4">
          {speakers.length === 0 && <p className="text-sm text-gray-500">No speakers added.</p>}
          {speakers.map((s, i) => (
            <div key={i} className="space-y-2 rounded border p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  aria-label={`Speaker ${i + 1} name`}
                  placeholder="Name"
                  value={s.name}
                  onChange={(e) => updateSpeaker(i, "name", e.target.value)}
                  className="input"
                />
                <input
                  aria-label={`Speaker ${i + 1} designation`}
                  placeholder="Designation"
                  value={s.designation}
                  onChange={(e) => updateSpeaker(i, "designation", e.target.value)}
                  className="input"
                />
              </div>
              <textarea
                aria-label={`Speaker ${i + 1} bio`}
                placeholder="Short bio"
                rows={2}
                value={s.bio}
                onChange={(e) => updateSpeaker(i, "bio", e.target.value)}
                className="input"
              />
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() => setSpeakers((r) => r.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <FieldError message={errors.speakers} />
          <input type="hidden" name="speakers" value={JSON.stringify(speakers)} />
        </div>
      </section>

      {/* Budget */}
      <section className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="card-title">Budget (₹)</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setBudgetLines((r) => [...r, { item: "", amount: "", notes: "" }])}
          >
            + Add line
          </button>
        </div>
        <div className="card-content space-y-3">
          {budgetLines.length === 0 && <p className="text-sm text-gray-500">No budget lines.</p>}
          {budgetLines.map((b, i) => (
            <div key={i} className="grid grid-cols-12 items-start gap-2">
              <input
                aria-label={`Budget line ${i + 1} item`}
                placeholder="Item"
                value={b.item}
                onChange={(e) => updateBudget(i, "item", e.target.value)}
                className="input col-span-5"
              />
              <input
                aria-label={`Budget line ${i + 1} amount`}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={b.amount}
                onChange={(e) => updateBudget(i, "amount", e.target.value)}
                className="input col-span-3"
              />
              <input
                aria-label={`Budget line ${i + 1} notes`}
                placeholder="Notes"
                value={b.notes}
                onChange={(e) => updateBudget(i, "notes", e.target.value)}
                className="input col-span-3"
              />
              <button
                type="button"
                className="col-span-1 text-sm text-red-600 hover:underline"
                onClick={() => setBudgetLines((r) => r.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <FieldError message={errors.budgetLines} />
          <div className="flex justify-end border-t pt-3">
            <p className="text-sm">
              Total:{" "}
              <span className="font-semibold">
                ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <input type="hidden" name="budgetLines" value={JSON.stringify(budgetLines)} />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link
          href={initialEvent ? `/events/${initialEvent.id}` : "/events"}
          className="btn btn-secondary"
        >
          Cancel
        </Link>
        <SubmitButton label={isEdit ? "Save changes" : "Create event"} />
      </div>
    </form>
  );
}
