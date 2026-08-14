// app/dashboard/page.tsx
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import AdminAnalytics from "../components/AdminAnalytics";
import ResetVotesButton from "../components/ResetVotesButton";

type Level = "Elementary" | "JHS" | "SHS" | "College";
type Position =
  | "President"
  | "Vice President"
  | "Secretary"
  | "Treasurer"
  | "Auditor"
  | "Representative";

type Voter = {
  id: string | number;
  status?: number | boolean | string;
  department?: Level;
  schoolId?: string;
  fullName?: string;
  course?: string | null;
  year?: string;
};

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

// ✅ NEW: shape for vote tallies
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

const LEVELS: Level[] = ["Elementary", "JHS", "SHS", "College"];
const POSITIONS: Position[] = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Representative",
];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login?next=/dashboard");

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000";

  // verify admin
  const meRes = await fetch(`${apiBase}/api/auth/me`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!meRes || !meRes.ok) redirect("/login?next=/dashboard");
  const meJson = await meRes.json();
  if ((meJson?.user?.role || "").toLowerCase() !== "admin") {
    redirect("/student-dashboard");
  }
  const adminName = meJson?.user?.username || "Admin";

  // fetch voters per level (parallel)
  const voterLists = await Promise.all(
    LEVELS.map(async (lvl) => {
      const r = await fetch(
        `${apiBase}/api/voters?department=${encodeURIComponent(lvl)}`,
        { headers: { cookie: `token=${token}` }, cache: "no-store" }
      ).catch(() => null);
      if (!r || !r.ok) return { level: lvl, rows: [] as Voter[] };
      const rows = (await r.json()) as Voter[];
      return { level: lvl, rows };
    })
  );

  // for activate the votings
  const statusRes = await fetch(`${apiBase}/api/votes/status`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  const votingStatus =
    statusRes && statusRes.ok ? await statusRes.json() : { open: false };

  // fetch candidates (all)
  const candRes = await fetch(`${apiBase}/api/candidates`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  const candidates: Candidate[] =
    candRes && candRes.ok ? await candRes.json() : [];

  // ✅ NEW: fetch vote tallies (all; filter client-side)
  const statsRes = await fetch(`${apiBase}/api/votes/stats`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  const voteTallies: CandVoteCount[] =
    statsRes && statsRes.ok ? await statsRes.json() : [];

  // compute voter stats
  const byLevel = voterLists.map(({ level, rows }) => {
    const voters = rows.length;
    const voted = rows.filter((v) => Number(v.status) === 1).length;
    const turnout = voters ? Math.round((voted / voters) * 1000) / 10 : 0;
    return { level, voters, voted, turnout };
  });
  const totalVoters = byLevel.reduce((a, b) => a + b.voters, 0);
  const totalVoted = byLevel.reduce((a, b) => a + b.voted, 0);
  const totalTurnout = totalVoters
    ? Math.round((totalVoted / totalVoters) * 1000) / 10
    : 0;

  // candidates stats
  const byPosition: Record<string, number> = {};
  POSITIONS.forEach((p) => (byPosition[p] = 0));
  for (const c of candidates)
    byPosition[c.position] = (byPosition[c.position] || 0) + 1;

  const byPartyMap = new Map<string, number>();
  for (const c of candidates) {
    const key = (c.partyList || "Independent").trim() || "Independent";
    byPartyMap.set(key, (byPartyMap.get(key) || 0) + 1);
  }
  const byParty = Array.from(byPartyMap.entries())
    .map(([party, count]) => ({ party, count }))
    .sort((a, b) => b.count - a.count);

  const byGender = {
    Male: candidates.filter((c) => c.gender === "Male").length,
    Female: candidates.filter((c) => c.gender === "Female").length,
  };

  const stats = {
    adminName,
    totals: {
      voters: totalVoters,
      voted: totalVoted,
      nonVoted: totalVoters - totalVoted,
      turnout: totalTurnout,
    },
    byLevel,
    candidates: {
      total: candidates.length,
      byPosition,
      byParty,
      byGender,
    },
    asOf: new Date().toISOString(),
  };

  return (
    <>
      <Navbar />
      <main className="max-w-[1200px] mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 mb-6">
          Welcome, <b>{adminName}</b>. Here’s a quick snapshot.
        </p>

        {/* Analytics UI */}
        <AdminAnalytics
          stats={stats}
          candidatesRaw={candidates}
          voteTallies={voteTallies}
          votingOpenInitial={Boolean(votingStatus.open)} // 👈 NEW
        />

        <div className="mt-8 flex gap-2 flex-wrap">
          <a
            href="/voters"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-100"
          >
            Manage Voters
          </a>
          <a
            href="/candidates"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-100"
          >
            Manage Candidates
          </a>

          {/* 🔴 Danger action */}
          {/* force relative "/api/..." so the browser sends the same-origin session cookie */}
          <ResetVotesButton apiBase="" />
        </div>
      </main>
    </>
  );
}
