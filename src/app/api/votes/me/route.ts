import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";

export async function GET() {
  const r = await fetch(`${API_BASE}/api/auth/me`, {
    method: "GET",
    credentials: "include", // 👈 ensures cookies are sent
    cache: "no-store",
  }).catch(() => null);

  if (!r) {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }

  if (r.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
