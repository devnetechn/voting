"use client";

import React from "react";
import Navbar from "../components/Navbar";

type Level = "Elementary" | "JHS" | "SHS" | "College";
type Position =
  | "President"
  | "Vice President"
  | "Secretary"
  | "Treasurer"
  | "Auditor"
  | "Representative";

type CandVoteCount = {
  candidateId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  partyList: string;
  position: Position;
  level: Level;
  photoUrl?: string | null;
  votes: number;
};

const POSITIONS: Position[] = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Representative",
];

export default function ResultsPage() {
  const [rows, setRows] = React.useState<CandVoteCount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchScores = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/internal/votes/scores", { cache: "no-store", signal });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to load scores");
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    fetchScores(controller.signal);
    const interval = setInterval(() => fetchScores(), 5000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchScores]);

  const races = React.useMemo(() => {
    const map = new Map<Position, CandVoteCount[]>();
    for (const r of rows) {
      if (!map.has(r.position)) map.set(r.position, []);
      map.get(r.position)!.push(r);
    }
    return POSITIONS.filter((p) => map.has(p)).map((p) => ({
      position: p,
      items: (map.get(p) || []).slice().sort((a, b) => b.votes - a.votes),
    }));
  }, [rows]);

  return (
    <>
      <Navbar />
      <main className="max-w-[900px] mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">Candidate Scores</h1>
        <p className="text-sm text-gray-600 mb-6">
          Live standing for your department. For fairness, scores shown here are
          delayed by about 15 minutes.
        </p>

        {loading && <p className="text-sm text-slate-500">Loading scores…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && races.length === 0 && (
          <p className="text-sm text-slate-500">No candidates to show yet.</p>
        )}

        <div className="space-y-5">
          {races.map((race) => {
            const totalVotes = race.items.reduce((sum, x) => sum + (Number(x.votes) || 0), 0);
            const leaderVotes = Math.max(0, ...race.items.map((x) => Number(x.votes) || 0)) || 1;

            return (
              <div key={race.position} className="rounded-lg border border-gray-200">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <div className="font-medium">{race.position}</div>
                  <div className="text-xs text-gray-600">
                    {race.items.length} candidate{race.items.length === 1 ? "" : "s"} •{" "}
                    <b>{totalVotes.toLocaleString()}</b> votes total
                  </div>
                </div>

                <div className="divide-y">
                  {race.items.map((c, idx) => {
                    const fullName = `${c.firstName} ${
                      c.middleName ? c.middleName + " " : ""
                    }${c.lastName}`.trim();
                    const votes = Number(c.votes) || 0;
                    const share = totalVotes ? (votes / totalVotes) * 100 : 0;

                    return (
                      <div
                        key={c.candidateId}
                        className="px-4 py-3 grid grid-cols-12 gap-3 items-center"
                      >
                        <div className="col-span-1 text-sm text-gray-600">{idx + 1}</div>

                        <div className="col-span-5 min-w-0">
                          <div className="font-medium truncate">{fullName}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {c.partyList && c.partyList.trim() ? c.partyList : "Independent"}
                          </div>
                        </div>

                        <div className="col-span-4">
                          <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full ${idx === 0 ? "bg-green-600" : "bg-[#0F4C75]"}`}
                              style={{ width: `${Math.round((votes / leaderVotes) * 100)}%` }}
                              title={`${votes.toLocaleString()} votes`}
                            />
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            {share.toFixed(1)}% share
                          </div>
                        </div>

                        <div className="col-span-2 text-right">
                          <div className="font-semibold">{votes.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">votes</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
