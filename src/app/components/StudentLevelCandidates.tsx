// app/components/StudentLevelCandidates.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

type Level = "Elementary" | "JHS" | "SHS" | "College";
type Position =
  | "President"
  | "Vice President"
  | "Secretary"
  | "Treasurer"
  | "Auditor"
  | "Representative";

type Item = {
  id: string;
  level: Level | null;
  position: Position;
  partyList: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: "Male" | "Female";
  year: string;
  photo: string | null;
};

type Props = {
  items: Item[];
  voted: Record<string, string>;
  canVote?: boolean;
};

const ORDER: Position[] = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Representative",
];

/* ---------------- Helpers (no `any`) ---------------- */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function extractApiError(u: unknown): string | null {
  if (!isObject(u)) return null;
  const e = u.error;
  const m = u.message;
  if (typeof e === "string") return e;
  if (typeof m === "string") return m;
  return null;
}
function extractExistingId(u: unknown): string | null {
  if (!isObject(u)) return null;
  const ex = u.existing;
  if (isObject(ex) && typeof ex.candidateId === "string") return ex.candidateId;
  return null;
}
const StudentLevelCandidates: React.FC<Props> = ({
  items,
  voted,
  canVote = true,
}) => {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [myVotes, setMyVotes] = React.useState<Record<string, string>>(
    voted || {}
  );
  const [selections, setSelections] = React.useState<Record<string, string>>(
    {}
  );

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  const grouped = React.useMemo(
    () =>
      ORDER.map((pos) => ({
        pos,
        items: items.filter((c) => c.position === pos),
      })),
    [items]
  );

  // Positions that still need a vote (have candidates, not yet voted)
  const pendingPositions = React.useMemo(
    () => grouped.filter((g) => g.items.length > 0 && !myVotes[g.pos]),
    [grouped, myVotes]
  );

  const allSelected = pendingPositions.every((g) => selections[g.pos]);
  const canSubmit =
    canVote && pendingPositions.length > 0 && allSelected && !submitting;

  const votingComplete =
    pendingPositions.length === 0 && Object.keys(myVotes).length > 0;

  function selectCandidate(position: Position, candidateId: string) {
    if (!canVote || myVotes[position]) return;
    setSelections((p) => ({ ...p, [position]: candidateId }));
  }

  async function submitAllVotes() {
    if (!canSubmit) return;
    const confirmed = window.confirm(
      "Submit your votes now? You will not be able to change them afterward."
    );
    if (!confirmed) return;

    setSubmitting(true);
    setErr(null);
    const failures: string[] = [];
    const resolvedVotes: Record<string, string> = {};

    for (const g of pendingPositions) {
      const candidateId = selections[g.pos];
      try {
        const r = await fetch("/internal/votes", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: String(candidateId) }),
        });

        const raw = await r.text();
        let j: unknown = null;
        try {
          j = raw ? JSON.parse(raw) : null;
        } catch {
          j = null;
        }

        if (r.status === 201) {
          resolvedVotes[g.pos] = candidateId;
          continue;
        }

        if (r.status === 409) {
          const existingId = extractExistingId(j);
          if (existingId) resolvedVotes[g.pos] = existingId;
          failures.push(extractApiError(j) || `You already voted for ${g.pos}.`);
          continue;
        }

        failures.push(extractApiError(j) || `Failed to submit vote for ${g.pos}.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Network error.";
        failures.push(`${g.pos}: ${msg}`);
      }
    }

    if (Object.keys(resolvedVotes).length > 0) {
      setMyVotes((p) => ({ ...p, ...resolvedVotes }));
    }

    const nowComplete = pendingPositions.every(
      (g) => resolvedVotes[g.pos] || myVotes[g.pos]
    );
    setSubmitting(false);

    if (nowComplete) {
      router.push("/student-dashboard/receipt");
      return;
    }

    if (failures.length > 0) setErr(failures.join(" "));
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      )}

      {grouped.map(
        (g) =>
          g.items.length > 0 && (
            <section
              key={g.pos}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-4 text-center">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F4C75]">
                  {g.pos}
                </h3>
                <span className="mt-1 block text-xs text-gray-600">
                  {g.items.length}{" "}
                  {g.items.length === 1 ? "candidate" : "candidates"}
                </span>
              </div>

              {/* Centered, responsive grid */}
              <div className="mx-auto">
                <div className="grid justify-center gap-4 sm:gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,320px))]">
                  {g.items.map((c, idx) => {
                    const full = `${c.firstName} ${
                      c.middleName ? c.middleName + " " : ""
                    }${c.lastName}`.trim();
                    const chosenId = myVotes[c.position];
                    const isChosen = chosenId === c.id;
                    const locked = Boolean(chosenId);
                    const isSelected = selections[c.position] === c.id;
                    const selectable = canVote && !locked;

                    return (
                      <article
                        key={c.id}
                        className={`group relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                          mounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                        } ${
                          isChosen || isSelected
                            ? "border-[#0F4C75] ring-2 ring-[#0F4C75]/40"
                            : ""
                        } hover:shadow-md`}
                        style={{
                          transitionDuration: "450ms",
                          transitionDelay: `${idx * 60}ms`,
                        }}
                      >
                        {/* PHOTO */}
                        <div className="relative w-full aspect-square bg-gray-100">
                          {c.photo ? (
                            <Image
                              src={c.photo}
                              alt={full}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-gray-400 text-xs">
                              No photo
                            </div>
                          )}
                        </div>

                        {/* BODY */}
                        <div className="flex flex-1 flex-col p-3">
                          <div
                            className={`text-center font-semibold ${
                              isChosen ? "text-green-700" : "text-gray-900"
                            }`}
                            title={full}
                          >
                            {full}
                          </div>
                          <div className="mt-1 text-center text-xs text-gray-600">
                            {(c.partyList || "Independent").trim() ||
                              "Independent"}{" "}
                            • {c.gender}
                          </div>
                          {c.year && (
                            <div className="mt-0.5 text-center text-xs text-gray-500">
                              {c.year}
                            </div>
                          )}

                          {/* RADIO SELECT */}
                          <div className="mt-auto pt-3">
                            <label
                              className={`flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition
                                ${
                                  !canVote
                                    ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                                    : isChosen
                                    ? "bg-green-600 text-white"
                                    : locked
                                    ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-[#0C3D5E] text-white cursor-pointer"
                                    : "bg-[#0F4C75] text-white hover:bg-[#0C3D5E] cursor-pointer"
                                }`}
                            >
                              <input
                                type="radio"
                                name={`vote-${c.position}`}
                                value={c.id}
                                checked={isChosen || isSelected}
                                disabled={!selectable || submitting}
                                onChange={() =>
                                  selectCandidate(c.position, c.id)
                                }
                                className="h-4 w-4 accent-white"
                              />
                              {!canVote
                                ? "Voting Closed"
                                : isChosen
                                ? "Voted"
                                : locked
                                ? "Already Voted"
                                : isSelected
                                ? "Selected"
                                : "Select"}
                            </label>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )
      )}

      {pendingPositions.length > 0 && (
        <div className="sticky bottom-4 z-10 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <p className="text-center text-sm text-gray-700">
            {allSelected
              ? "You've selected a candidate for every position. Submit to cast your votes — this cannot be undone."
              : `Select a candidate for every position before you can submit. ${
                  pendingPositions.filter((g) => !selections[g.pos]).length
                } of ${pendingPositions.length} position(s) still need a selection.`}
          </p>
          <button
            onClick={submitAllVotes}
            disabled={!canSubmit}
            className={`mx-auto mt-3 flex w-full max-w-xs items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition sm:w-auto ${
              canSubmit
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            {submitting ? "Submitting…" : "Submit All Votes"}
          </button>
        </div>
      )}

      {votingComplete && (
        <div className="sticky bottom-4 z-10 rounded-xl border border-green-200 bg-green-50 p-4 shadow-lg">
          <p className="text-center text-sm text-green-800">
            Thank you for voting! View your receipt as proof of your submitted votes.
          </p>
          <Link
            href="/student-dashboard/receipt"
            className="mx-auto mt-3 flex w-full max-w-xs items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 sm:w-auto"
          >
            View Receipt
          </Link>
        </div>
      )}
    </div>
  );
};

export default StudentLevelCandidates;
