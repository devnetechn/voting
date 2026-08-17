"use client";

import React from "react";

type Level = "Elementary" | "JHS" | "SHS" | "College";
type Position =
  | "President"
  | "Vice President"
  | "Secretary"
  | "Treasurer"
  | "Auditor"
  | "Representative";

type Candidate = {
  id: string;
  level: Level | null;
  position: Position;
  partyList: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: "Male" | "Female";
  year?: string | number | null;
  photoUrl?: string | null;
};

// incoming tallies
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

type Stats = {
  adminName: string;
  totals: { voters: number; voted: number; nonVoted: number; turnout: number };
  byLevel: Array<{
    level: Level;
    voters: number;
    voted: number;
    turnout: number;
  }>;
  candidates: {
    total: number;
    byPosition: Record<Position | string, number>;
    byParty: Array<{ party: string; count: number }>;
    byGender: { Male: number; Female: number };
  };
  asOf: string;
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

// helpers to keep type safety (no 'any')
const LEVEL_FILTERS = ["All", ...LEVELS] as const;
type LevelFilter = (typeof LEVEL_FILTERS)[number];
function isPosition(x: string): x is Position {
  return (POSITIONS as readonly string[]).includes(x);
}

export default function AdminAnalytics({
  stats,
  candidatesRaw,
  voteTallies: voteTalliesInitial,
  votingOpenInitial,
}: {
  stats: Stats;
  candidatesRaw: Candidate[];
  voteTallies: CandVoteCount[];
  votingOpenInitial: boolean;
}) {
  const [levelFilter, setLevelFilter] = React.useState<LevelFilter>("All");
  const [posFilter, setPosFilter] = React.useState<"All" | Position>(
    "President"
  );

  // ✅ NEW: live-updating tally (polls every 5s, no page reload needed)
  const [voteTallies, setVoteTallies] = React.useState<CandVoteCount[]>(
    voteTalliesInitial
  );
  React.useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const r = await fetch("/internal/votes/stats", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as CandVoteCount[];
        if (!cancelled && Array.isArray(data)) setVoteTallies(data);
      } catch {
        // ignore transient network errors; next tick will retry
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // voting toggle state
  const [votingOpen, setVotingOpen] =
    React.useState<boolean>(votingOpenInitial);
  const [saving, setSaving] = React.useState(false);
  async function toggleVoting() {
    try {
      setSaving(true);
      const r = await fetch("/internal/votes/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: !votingOpen }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) setVotingOpen(Boolean(j.open));
      else alert(j?.error || "Failed to update voting status");
    } finally {
      setSaving(false);
    }
  }

  // Filter candidates by level (or All)
  const filteredCands = React.useMemo(() => {
    if (levelFilter === "All") return candidatesRaw;
    return candidatesRaw.filter((c) => c.level === levelFilter);
  }, [candidatesRaw, levelFilter]);

  // Recompute candidate breakdowns for the current filter
  const candCounts = React.useMemo(() => {
    const byPosition: Record<string, number> = {};
    for (const p of POSITIONS) byPosition[p] = 0;

    const byParty = new Map<string, number>();
    const byGender = { Male: 0, Female: 0 };

    for (const c of filteredCands) {
      byPosition[c.position] = (byPosition[c.position] || 0) + 1;

      const party = (c.partyList || "Independent").trim() || "Independent";
      byParty.set(party, (byParty.get(party) || 0) + 1);

      if (c.gender === "Male") byGender.Male++;
      else if (c.gender === "Female") byGender.Female++;
    }

    const byPartyArr = Array.from(byParty.entries())
      .map(([party, count]) => ({ party, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: filteredCands.length,
      byPosition,
      byParty: byPartyArr,
      byGender,
    };
  }, [filteredCands]);

  // ✅ NEW: export the full tally (all levels/positions) as CSV
  function exportCsv() {
    const header = ["Level", "Position", "Candidate", "Party", "Votes"];
    const rows = voteTallies
      .slice()
      .sort(
        (a, b) =>
          a.level.localeCompare(b.level) ||
          a.position.localeCompare(b.position) ||
          b.votes - a.votes
      )
      .map((c) => {
        const fullName = `${c.firstName} ${
          c.middleName ? c.middleName + " " : ""
        }${c.lastName}`.trim();
        return [
          c.level,
          c.position,
          fullName,
          c.partyList && c.partyList.trim() ? c.partyList : "Independent",
          String(c.votes),
        ];
      });

    const escapeCsv = (v: string) =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = [header, ...rows]
      .map((r) => r.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vote-tally-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const fmt = (n: number) => n.toLocaleString();
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  const topPartyCount = Math.max(1, ...candCounts.byParty.map((p) => p.count));

  // Totals for the current view (All vs selected Level)
  const totalsForView = React.useMemo(() => {
    if (levelFilter === "All") return stats.totals;

    const row = stats.byLevel.find((r) => r.level === levelFilter);
    const voters = row?.voters ?? 0;
    const voted = row?.voted ?? 0;
    const nonVoted = voters - voted;
    const turnout = row?.turnout ?? (voters ? (voted / voters) * 100 : 0);

    return { voters, voted, nonVoted, turnout };
  }, [stats, levelFilter]);

  // filter tallies client-side
  const filteredTallies = React.useMemo(() => {
    let rows = voteTallies.slice();
    if (levelFilter !== "All")
      rows = rows.filter((r) => r.level === levelFilter);
    if (posFilter !== "All")
      rows = rows.filter((r) => r.position === posFilter);
    return rows.sort(
      (a, b) => b.votes - a.votes || a.lastName.localeCompare(b.lastName)
    );
  }, [voteTallies, levelFilter, posFilter]);

  // NOTE: removed unused totalVotesInFilter to satisfy no-unused-vars

  return (
    <section className="space-y-6">
      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600">Filter:</span>
        {LEVEL_FILTERS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setLevelFilter(lvl)}
            className={`px-3 py-1.5 rounded-md border text-sm ${
              levelFilter === lvl
                ? "bg-[#0F4C75] text-white border-[#0F4C75]"
                : "border-gray-300 hover:bg-gray-100"
            }`}
            title={lvl === "All" ? "Show all levels" : `Show ${lvl} only`}
          >
            {lvl}
          </button>
        ))}

        {/* position filter */}
        <div className="ml-2 flex items-center gap-2">
          <span className="text-sm text-gray-600">Position:</span>
          <select
            className="border rounded-md text-sm px-2 py-1"
            value={posFilter}
            onChange={(e) =>
              setPosFilter(isPosition(e.target.value) ? e.target.value : "All")
            }
          >
            <option value="All">All</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Voting control */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">Voting Status</div>
          <div className="mt-1">
            {votingOpen ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 text-green-700 px-2.5 py-1 text-xs border border-green-200">
                ● Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-xs border border-gray-200">
                ● Inactive
              </span>
            )}
          </div>
        </div>
        <button
          onClick={toggleVoting}
          disabled={saving}
          className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium ${
            votingOpen
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[#0F4C75] hover:bg-[#0C3D5E]"
          } text-white`}
          title={
            votingOpen
              ? "Deactivate (hide from students & block votes)"
              : "Activate (show to students & allow votes)"
          }
        >
          {saving
            ? "Saving..."
            : votingOpen
            ? "Deactivate Voting"
            : "Activate Voting"}
        </button>
      </div>

      {/* KPI Cards — now reflect selected level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Total Voters"
          value={fmt(totalsForView.voters)}
          subtitle={
            levelFilter === "All" ? "All departments" : `Level: ${levelFilter}`
          }
        />
        <Card
          title="Voted"
          value={fmt(totalsForView.voted)}
          subtitle={`Turnout ${fmtPct(totalsForView.turnout)}`}
        />
        <Card
          title="Not Voted"
          value={fmt(totalsForView.nonVoted)}
          subtitle="Remaining"
        />
        <Card
          title="Candidates"
          value={fmt(candCounts.total)}
          subtitle={
            levelFilter === "All" ? "All levels" : `Level: ${levelFilter}`
          }
        />
      </div>

      {/* Candidates Breakdown (filtered by level) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* by Position */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold mb-4">
            Candidates by Position{" "}
            <span className="text-xs text-gray-500">
              {levelFilter === "All"
                ? "(All levels)"
                : `(Level: ${levelFilter})`}
            </span>
          </h3>
          <div className="space-y-2">
            {Object.entries(candCounts.byPosition).map(([pos, count]) => (
              <div
                key={pos}
                className="flex items-center justify-between text-sm border-b last:border-b-0 py-2"
              >
                <span>{pos}</span>
                <b>{fmt(count)}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Parties */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold mb-4">
            Parties{" "}
            <span className="text-xs text-gray-500">
              {levelFilter === "All"
                ? "(All levels)"
                : `(Level: ${levelFilter})`}
            </span>
          </h3>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Top Parties</span>
              <span className="text-gray-600">
                {candCounts.byParty.length} total
              </span>
            </div>
            <div className="space-y-2">
              {candCounts.byParty.slice(0, 6).map((p) => (
                <div key={p.party}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[60%]" title={p.party}>
                      {p.party}
                    </span>
                    <b>{fmt(p.count)}</b>
                  </div>
                  <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-[#0F4C75]"
                      style={{
                        width: `${Math.round(
                          (p.count / topPartyCount) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vote Counts grouped by Race (Level + Position) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Voting Statistics</h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              {levelFilter !== "All" ? `${levelFilter} • ` : "All levels • "}
              {posFilter !== "All" ? posFilter : "All positions"}
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
              title="Download the full vote tally (all levels/positions) as CSV"
            >
              Export CSV
            </button>
          </div>
        </div>

        {(() => {
          // order helpers
          const lvlIdx = (l: Level) =>
            (["Elementary", "JHS", "SHS", "College"] as Level[]).indexOf(l);
          const posIdx = (p: Position) =>
            (
              [
                "President",
                "Vice President",
                "Secretary",
                "Treasurer",
                "Auditor",
                "Representative",
              ] as Position[]
            ).indexOf(p);

          // filter same as table earlier
          const rows = filteredTallies;

          // group by level+position
          const map = new Map<
            string,
            { level: Level; position: Position; items: CandVoteCount[] }
          >();
          for (const r of rows) {
            const key = `${r.level}__${r.position}`;
            if (!map.has(key))
              map.set(key, {
                level: r.level,
                position: r.position,
                items: [] as CandVoteCount[],
              });
            map.get(key)!.items.push(r);
          }

          // sort races
          const races = Array.from(map.values()).sort(
            (a, b) =>
              lvlIdx(a.level) - lvlIdx(b.level) ||
              posIdx(a.position) - posIdx(b.position)
          );

          if (races.length === 0) {
            return <div className="text-sm text-gray-600">No votes yet.</div>;
          }

          return (
            <div className="space-y-5">
              {races.map((race) => {
                const items = race.items
                  .slice()
                  .sort(
                    (a, b) =>
                      b.votes - a.votes || a.lastName.localeCompare(b.lastName)
                  );

                const totalVotes = items.reduce(
                  (sum, x) => sum + (Number(x.votes) || 0),
                  0
                );
                const leaderVotes =
                  Math.max(0, ...items.map((x) => Number(x.votes) || 0)) || 1;

                return (
                  <div
                    key={`${race.level}__${race.position}`}
                    className="rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      <div className="font-medium">
                        {race.level} • {race.position}
                      </div>
                      <div className="text-xs text-gray-600">
                        {items.length} candidate{items.length === 1 ? "" : "s"}{" "}
                        • <b>{totalVotes.toLocaleString()}</b> votes total
                      </div>
                    </div>

                    <div className="divide-y">
                      {items.map((c, idx) => {
                        const fullName = `${c.firstName} ${
                          c.middleName ? c.middleName + " " : ""
                        }${c.lastName}`.trim();
                        const votes = Number(c.votes) || 0;
                        const share = totalVotes
                          ? (votes / totalVotes) * 100
                          : 0;
                        const margin = votes - leaderVotes;

                        return (
                          <div
                            key={c.candidateId}
                            className="px-4 py-3 grid grid-cols-12 gap-3 items-center"
                          >
                            <div className="col-span-1 text-sm text-gray-600">
                              {idx + 1}
                            </div>

                            <div className="col-span-4 min-w-0">
                              <div className="font-medium truncate">
                                {fullName}
                              </div>
                              <div className="text-xs text-gray-600 truncate">
                                {c.partyList && c.partyList.trim()
                                  ? c.partyList
                                  : "Independent"}
                              </div>
                            </div>

                            <div className="col-span-4">
                              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    idx === 0 ? "bg-green-600" : "bg-[#0F4C75]"
                                  }`}
                                  style={{
                                    width: `${Math.round(
                                      (votes / leaderVotes) * 100
                                    )}%`,
                                  }}
                                  title={`${votes.toLocaleString()} votes`}
                                />
                              </div>
                              <div className="mt-1 text-xs text-gray-600">
                                {share.toFixed(1)}% share{" "}
                                {idx === 0 ? (
                                  <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                                    Highest Votes
                                  </span>
                                ) : (
                                  <span className="ml-2 text-gray-500">
                                    Δ {margin}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="col-span-3 text-right">
                              <div className="font-semibold">
                                {votes.toLocaleString()}
                              </div>
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
          );
        })()}
      </div>

      <p className="text-xs text-gray-500">
        As of {new Date(stats.asOf).toLocaleString()}
      </p>
    </section>
  );
}

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}
