// src/app/student-dashboard/page.tsx
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Navbar from "../components/Navbar";
import StudentLevelCandidates from "../components/StudentLevelCandidates";

type Level = "Elementary" | "JHS" | "SHS" | "College";

type Me = {
  user?: {
    role?: string;
    fullName?: string;
    full_name?: string;
    fullname?: string;
    firstName?: string;
    lastName?: string;
    schoolId?: string;
    department?: string | null;
  };
};

type CandidateApi = {
  id: string;
  level: string | Level | null;
  position:
    | "President"
    | "Vice President"
    | "Secretary"
    | "Treasurer"
    | "Auditor"
    | "Representative";
  partyList: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: "Male" | "Female";
  year: string | number | null | undefined;
  photoPath?: string | null;
  photoUrl?: string | null;
};

function normalizeYear(v: string | number | null | undefined): string {
  if (typeof v === "string") return v.trim() === "NaN" ? "" : v.trim();
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return "";
}

function normLevel(s?: string | null): Level | null {
  const d = (s || "").trim().toLowerCase();
  if (!d) return null;
  if (/(^|[^a-z])(elem|elementary)([^a-z]|$)/i.test(d)) return "Elementary";
  if (/(^|[^a-z])(jhs|junior\s*high)([^a-z]|$)/i.test(d)) return "JHS";
  if (/(^|[^a-z])(shs|senior\s*high)([^a-z]|$)/i.test(d)) return "SHS";
  if (/college|coll\.?/i.test(d)) return "College";
  if (d === "elementary") return "Elementary";
  if (d === "jhs") return "JHS";
  if (d === "shs") return "SHS";
  if (d === "college") return "College";
  return null;
}

// Fallback: infer level from year text
function inferLevelFromYear(year?: string | null): Level | null {
  const y = (year || "").toLowerCase();
  if (!y) return null;
  if (/grade\s*(1|2|3|4|5|6)\b/.test(y)) return "Elementary";
  if (/grade\s*(7|8|9|10)\b/.test(y)) return "JHS";
  if (/grade\s*(11|12)\b/.test(y)) return "SHS";
  if (/(^|\s)(1st|2nd|3rd|4th)\s*year\b/.test(y)) return "College";
  if (/\b(year\s*1|year\s*2|year\s*3|year\s*4)\b/.test(y)) return "College";
  return null;
}

export default async function StudentDashboard() {
  // auth
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login?next=/student-dashboard");

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000";

  const siteBase =
    process.env.NEXT_PUBLIC_SITE_BASE || "http://192.168.1.236:3000";

  // who am i
  const meRes = await fetch(`${apiBase}/api/auth/me`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!meRes || !meRes.ok) redirect("/login?next=/student-dashboard");
  const me = (await meRes.json()) as Me;
  if ((me?.user?.role || "").toLowerCase() !== "student") redirect("/dashboard");

  const u = me.user || {};
  const displayName =
    (
      u.fullName ||
      u.full_name ||
      u.fullname ||
      [u.firstName, u.lastName].filter(Boolean).join(" ")
    )?.trim() || "Student";

  const studentLevel = normLevel(u.department);

  // candidates (ask backend to filter by level already)
  const listUrl = studentLevel
    ? `${apiBase}/api/candidates?level=${encodeURIComponent(studentLevel)}`
    : `${apiBase}/api/candidates`;

  const candRes = await fetch(listUrl, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);

  const raw: CandidateApi[] = candRes && candRes.ok ? await candRes.json() : [];

  // Build a type compatible with StudentLevelCandidates props
  type ItemsProp = React.ComponentProps<
    typeof StudentLevelCandidates
  >["items"];

  // Normalize each candidate, with fallback inference (for legacy rows)
  const normalized: ItemsProp = raw.map((a) => {
    const levelRaw = a.level == null ? null : String(a.level);
    const levelNorm = normLevel(levelRaw);
    const yr = normalizeYear(a.year);
    const levelFinal = levelNorm || inferLevelFromYear(yr);
    return {
      id: a.id,
      level: levelFinal,
      position: a.position,
      partyList: a.partyList,
      firstName: a.firstName,
      middleName: a.middleName || "",
      lastName: a.lastName,
      gender: a.gender,
      year: yr,
      photo:
        a.photoUrl ??
        (a.photoPath
          ? a.photoPath
          : null),
    };
  });

  // Filter by student level (defensive)
  const filtered = studentLevel ? normalized.filter((c) => c.level === studentLevel) : [];

  // ---------- My Votes (needs token forwarded!) ----------
  type MyVote = { position: string; candidateId: string; level: string };

  const votesRes = await fetch(`${siteBase}/internal/votes/me`, {
    headers: { cookie: `token=${token}` }, // forward token cookie
    cache: "no-store",
  }).catch(() => null);

  const myVotes: MyVote[] = votesRes && votesRes.ok ? await votesRes.json() : [];
  const votedMap: Record<string, string> = Object.fromEntries(
    myVotes.map((v) => [v.position, v.candidateId])
  );

  // toggle sa active / status
  const statusRes = await fetch(`${apiBase}/api/votes/status`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  const votingStatus =
    statusRes && statusRes.ok ? await statusRes.json() : { open: false };
  const canVote = Boolean(votingStatus.open);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* HERO – no border, same BG to avoid black line */}
      <header className="w-full bg-slate-50">
        <div className="max-w-[1200px] mx-auto px-6 py-8 text-center sm:py-12">
          <Image
            src="/stratford logo.png"
            alt="Stratford International School Logo"
            width={320}
            height={320}
            priority
            className="mx-auto h-40 w-40 sm:h-56 sm:w-56 object-contain"
          />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:mt-6 sm:text-3xl md:text-5xl">
            Stratford International School
            <br className="hidden sm:block" /> E-Boto
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600">
            Safe <span className="mx-1">•</span> Reliable <span className="mx-1">•</span> Secure <span className="mx-1">•</span> Fast
          </p>
        </div>
      </header>

      {/* Main area uses the SAME BG so synced gyud */}
      <main className="max-w-[1200px] mx-auto px-6 pb-10 bg-slate-50">
        <h1 className="text-xl font-semibold">Student Dashboard</h1>
        <p>
          Welcome, <strong>{displayName}</strong>! 🎓
        </p>
        {u.department && (
          <p className="text-sm text-gray-600 mt-1">
            Department: {u.department}
          </p>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Candidates for your department {studentLevel ? `(${studentLevel})` : ""}
            </h2>
            <span className="text-sm text-gray-600">
              {filtered.length} {filtered.length === 1 ? "candidate" : "candidates"}
            </span>
          </div>

          {!canVote ? (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              Voting is currently <b>closed</b>. Please check back later.
            </div>
          ) : !studentLevel ? (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              We couldn&apos;t determine your department. Please contact the admin to update your profile.
            </div>
          ) : candRes && !candRes.ok ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              Failed to load candidates (HTTP {candRes.status}). Please try again later.
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              No candidates available for <b>{studentLevel}</b> yet.
            </div>
          ) : (
            <StudentLevelCandidates items={filtered} voted={votedMap} canVote={canVote} />
          )}
        </section>
      </main>
    </div>
  );
}
