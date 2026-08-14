// src/app/student-dashboard/receipt/page.tsx
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Navbar from "../../components/Navbar";
import DownloadReceiptButton from "../../components/DownloadReceiptButton";
import { buildReceiptHtml, computeReceiptHash } from "../../lib/receipt";

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
  position: string;
  partyList: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
};

type MyVote = {
  position: string;
  candidateId: string;
  level: string;
  createdAt?: string;
};

function normLevel(s?: string | null): Level | null {
  const d = (s || "").trim().toLowerCase();
  if (!d) return null;
  if (/(^|[^a-z])(elem|elementary)([^a-z]|$)/i.test(d)) return "Elementary";
  if (/(^|[^a-z])(jhs|junior\s*high)([^a-z]|$)/i.test(d)) return "JHS";
  if (/(^|[^a-z])(shs|senior\s*high)([^a-z]|$)/i.test(d)) return "SHS";
  if (/college|coll\.?/i.test(d)) return "College";
  return null;
}

const ORDER = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Representative",
];

export default async function StudentReceiptPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login?next=/student-dashboard/receipt");

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000";
  const siteBase =
    process.env.NEXT_PUBLIC_SITE_BASE || "http://192.168.1.236:3000";

  const meRes = await fetch(`${apiBase}/api/auth/me`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!meRes || !meRes.ok) redirect("/login?next=/student-dashboard/receipt");
  const me = (await meRes.json()) as Me;
  if ((me?.user?.role || "").toLowerCase() !== "student") redirect("/dashboard");

  const u = me.user || {};
  const studentName =
    (
      u.fullName ||
      u.full_name ||
      u.fullname ||
      [u.firstName, u.lastName].filter(Boolean).join(" ")
    )?.trim() || "Student";
  const schoolId = u.schoolId || "";
  const studentLevel = normLevel(u.department);

  const listUrl = studentLevel
    ? `${apiBase}/api/candidates?level=${encodeURIComponent(studentLevel)}`
    : `${apiBase}/api/candidates`;
  const candRes = await fetch(listUrl, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  const candidates: CandidateApi[] =
    candRes && candRes.ok ? await candRes.json() : [];

  const votesRes = await fetch(`${siteBase}/internal/votes/me`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  const myVotes: MyVote[] = votesRes && votesRes.ok ? await votesRes.json() : [];
  const votedMap: Record<string, string> = Object.fromEntries(
    myVotes.map((v) => [v.position, v.candidateId])
  );

  // Positions that require a vote (have candidates for this student's level)
  const requiredPositions = ORDER.filter((pos) =>
    candidates.some((c) => normLevel(c.level) === studentLevel && c.position === pos)
  );
  const votingComplete =
    requiredPositions.length > 0 &&
    requiredPositions.every((pos) => votedMap[pos]);

  if (!votingComplete) redirect("/student-dashboard");

  const rows = requiredPositions.map((pos) => {
    const candidateId = votedMap[pos];
    const c = candidates.find((x) => x.id === candidateId);
    const candidateName = c
      ? `${c.firstName} ${c.middleName ? c.middleName + " " : ""}${c.lastName}`.trim()
      : "Unknown";
    const partyList = (c?.partyList || "Independent").trim() || "Independent";
    return { position: pos, candidateName, partyList };
  });

  const earliestVoteTime = myVotes
    .map((v) => (v.createdAt ? new Date(v.createdAt).getTime() : NaN))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)[0];
  const submittedAt = earliestVoteTime
    ? new Date(earliestVoteTime).toLocaleString()
    : new Date().toLocaleString();

  const refCode = computeReceiptHash(schoolId, votedMap);
  const html = buildReceiptHtml({
    studentName,
    schoolId,
    submittedAt,
    rows,
    refCode,
  });
  const filename = `receipt_${schoolId || "student"}_${refCode.slice(0, 8)}.html`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-[560px] px-6 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-center text-lg font-semibold text-[#0F4C75]">
            Stratford International School &mdash; E-Boto
          </h1>
          <p className="mt-1 text-center text-xs text-gray-500">
            Official Vote Receipt
          </p>

          <div className="mt-5 space-y-1 text-sm">
            <p>
              <span className="font-medium">Student:</span> {studentName}
            </p>
            <p>
              <span className="font-medium">School ID:</span> {schoolId || "N/A"}
            </p>
            <p>
              <span className="font-medium">Submitted:</span> {submittedAt}
            </p>
          </div>

          {/* Stacked cards on mobile */}
          <div className="mt-5 space-y-3 sm:hidden">
            {rows.map((r) => (
              <div
                key={r.position}
                className="rounded-lg border border-gray-200 p-3 text-sm"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {r.position}
                </div>
                <div className="mt-1 font-medium text-gray-900">
                  {r.candidateName}
                </div>
                <div className="text-gray-600">{r.partyList}</div>
              </div>
            ))}
          </div>

          {/* Table on sm+ screens */}
          <table className="mt-5 hidden w-full border-collapse text-sm sm:table">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="border-b border-gray-200 py-2">Position</th>
                <th className="border-b border-gray-200 py-2">Candidate</th>
                <th className="border-b border-gray-200 py-2">Party</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.position}>
                  <td className="border-b border-gray-100 py-2">{r.position}</td>
                  <td className="border-b border-gray-100 py-2">{r.candidateName}</td>
                  <td className="border-b border-gray-100 py-2">{r.partyList}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs">
            <div className="mb-1 font-medium text-[#0F4C75]">
              Verification Reference Code
            </div>
            <div className="break-all text-gray-700">{refCode}</div>
          </div>

          <p className="mt-4 text-center text-[11px] text-gray-400">
            This receipt is proof of your submitted votes. Keep it for your
            record.
          </p>

          <div className="mt-6">
            <DownloadReceiptButton html={html} filename={filename} />
          </div>
        </div>
      </main>
    </div>
  );
}
