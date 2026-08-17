"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

type Level = "Elementary" | "JHS" | "SHS" | "College";
type Position =
  | "President"
  | "Vice President"
  | "Secretary"
  | "Treasurer"
  | "Auditor"
  | "Representative";

type PublicCandidate = {
  id: string;
  level: Level;
  position: Position;
  partyList: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: "Male" | "Female";
  year?: string | number | null;
  photoUrl?: string | null;
};

const LEVELS: Level[] = ["Elementary", "JHS", "SHS", "College"];
const POSITIONS: Position[] = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Representative",
];

export default function CandidateDetailsPage() {
  const [candidates, setCandidates] = React.useState<PublicCandidate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [levelFilter, setLevelFilter] = React.useState<Level | "All">("All");

  React.useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/candidates/public", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!r.ok) throw new Error("Failed to load candidates");
        const data = (await r.json()) as PublicCandidate[];
        setCandidates(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const filtered = React.useMemo(() => {
    if (levelFilter === "All") return candidates;
    return candidates.filter((c) => c.level === levelFilter);
  }, [candidates, levelFilter]);

  const races = React.useMemo(() => {
    const map = new Map<
      string,
      { level: Level; position: Position; items: PublicCandidate[] }
    >();
    for (const c of filtered) {
      const key = `${c.level}__${c.position}`;
      if (!map.has(key)) map.set(key, { level: c.level, position: c.position, items: [] });
      map.get(key)!.items.push(c);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) ||
        POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position)
    );
  }, [filtered]);

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Candidate Details</h1>
          <Link href="/login" className="text-sm text-sky-600 hover:underline">
            Back to Login
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-2 flex-wrap">
          {(["All", ...LEVELS] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-md border text-sm ${
                levelFilter === lvl
                  ? "bg-[#0F4C75] text-white border-[#0F4C75]"
                  : "border-gray-300 bg-white hover:bg-gray-100"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-slate-500">Loading candidates…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && races.length === 0 && (
          <p className="text-sm text-slate-500">No candidates to show yet.</p>
        )}

        <div className="space-y-6">
          {races.map((race) => (
            <div
              key={`${race.level}__${race.position}`}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 font-medium">
                {race.level} • {race.position}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                {race.items.map((c) => {
                  const fullName = `${c.firstName} ${
                    c.middleName ? c.middleName + " " : ""
                  }${c.lastName}`.trim();
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100">
                        {c.photoUrl ? (
                          <Image
                            src={c.photoUrl}
                            alt={fullName}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{fullName}</div>
                        <div className="text-xs text-gray-600 truncate">
                          {c.partyList && c.partyList.trim() ? c.partyList : "Independent"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
