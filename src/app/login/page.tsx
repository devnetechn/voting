"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

type LoginResponse = {
  role?: "admin" | "student" | string;
  user?: {
    id: string | number;
    username?: string;
    schoolId?: string;
    role?: string;
  };
  error?: string;
};

const ROLE_TO_DEFAULT_PATH: Record<"admin" | "student", string> = {
  admin: "/dashboard",
  student: "/student-dashboard",
};

// ✅ Use API URL from .env
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/* ---------------- Client Inner Component ---------------- */
function LoginInner() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const router = useRouter();
  const params = useSearchParams();

  const nextParam = useMemo(() => params.get("next") || "", [params]);
  const nextSafe = useMemo(
    () => (nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : ""),
    [nextParam]
  );

  // Redirect if already logged in
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const r = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (r.ok) {
          const j = await r.json();
          const role = String(j?.user?.role ?? j?.role ?? "").toLowerCase();
          if (role === "student" || role === "admin") {
            const fallback = ROLE_TO_DEFAULT_PATH[role as "admin" | "student"];
            router.replace(nextSafe || fallback);
            return;
          }
        }
      } catch {}
      setChecking(false);
    })();
    return () => controller.abort();
  }, [router, nextSafe]);

  // Handle login form submit
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr(null);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);

    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });

      const j = (await r.json().catch(() => ({}))) as LoginResponse;
      if (!r.ok) throw new Error(j?.error || "Login failed");

      let role = (j.role || j.user?.role || "").toString().toLowerCase();
      if (role !== "admin" && role !== "student") {
        const meRes = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });
        if (meRes.ok) {
          const me = await meRes.json();
          role = String(me?.user?.role || "").toLowerCase();
        }
      }
      if (role !== "admin" && role !== "student")
        throw new Error("Role missing");

      const fallback = ROLE_TO_DEFAULT_PATH[role as "admin" | "student"];
      router.replace(nextSafe || fallback);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      clearTimeout(t);
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-sm text-slate-500">Checking session…</p>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        {/* Header with background and logo */}
        <div
          className="relative h-28 sm:h-32 bg-slate-200"
          style={{
            backgroundImage: "url('/bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Image
            src="/stratford logo.png"
            alt="Stratford International School"
            width={120}
            height={120}
            priority
            className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2
                       h-24 w-24 rounded-full bg-white object-contain ring-4 ring-white shadow"
          />
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-16">
          <h1 className="mb-2 text-center text-2xl font-bold tracking-wide">
            WELCOME TO SIS E-BOTO
          </h1>

          <label className="mb-1 block text-xs font-medium text-slate-700">
            School ID
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Enter School ID"
            autoComplete="username"
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />

          <label className="mb-1 block text-xs font-medium text-slate-700">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter password"
            autoComplete="current-password"
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />

          <div className="mb-3">
            <a
              href="/forgot-password"
              className="text-sm text-sky-600 hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "LOGIN"}
          </button>
        </div>
      </form>
    </main>
  );
}

/* ---------------- Wrapper with Suspense ---------------- */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center">Loading login…</div>}>
      <LoginInner />
    </Suspense>
  );
}
