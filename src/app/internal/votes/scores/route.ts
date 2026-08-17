import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";

export async function GET() {
  const token = (await cookies()).get("token")?.value || "";
  const r = await fetch(`${API_BASE}/api/votes/scores`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  const data = r ? await r.json().catch(() => ({})) : { error: "Upstream unavailable" };
  return NextResponse.json(data, { status: r?.status ?? 502 });
}
