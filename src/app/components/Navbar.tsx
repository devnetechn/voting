"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";

type Role = "admin" | "student" | null;

const linkClass =
  "px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors";

export default function Navbar() {
  const [role, setRole] = useState<Role>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!r.ok) return;
        const j = await r.json();
        // ✅ read from j.user.role or j.role
        const ro = String(j?.user?.role ?? j?.role ?? "").toLowerCase();
        if (ro === "admin" || ro === "student") setRole(ro as Role);
      } catch {}
    })();
    return () => controller.abort();
  }, []);

  // ✅ default to "/" while role unknown to avoid prefetching /login
  const homeHref =
    role === "admin"
      ? "/dashboard"
      : role === "student"
      ? "/student-dashboard"
      : "/";

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {/* ✅ no prefetch on Home to avoid caching /login while role is null */}
        <Link
          href={homeHref}
          prefetch={false}
          className={linkClass}
          onClick={onNavigate}
        >
          Home
        </Link>

        {role === "admin" && (
          <>
            <Link
              href="/voters/add"
              prefetch={false}
              className={linkClass}
              onClick={onNavigate}
            >
              Add Voters
            </Link>
            <Link
              href="/candidates"
              prefetch={false}
              className={linkClass}
              onClick={onNavigate}
            >
              Add Candidate
            </Link>
            <Link
              href="/voters"
              prefetch={false}
              className={linkClass}
              onClick={onNavigate}
            >
              Voters
            </Link>
          </>
        )}

        {role === "student" && (
          <>
            <Link
              href="/student/change-profile"
              prefetch={false}
              className={linkClass}
              onClick={onNavigate}
            >
              Profile
            </Link>
            <Link
              href="/results"
              prefetch={false}
              className={linkClass}
              onClick={onNavigate}
            >
              Candidate Scores
            </Link>
          </>
        )}

        <Link href="/about" className={linkClass} onClick={onNavigate}>
          About Us
        </Link>

        {/* Optional: kung gusto nimo i-avoid flicker, pwede nimo i-hide ni hangtod ma-resolve ang role */}
        {role ? (
          <LogoutButton asLink />
        ) : (
          <Link
            href="/login"
            prefetch={false}
            className={linkClass}
            onClick={onNavigate}
          >
            Login
          </Link>
        )}
      </>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0F4C75] text-white border-b border-[#0C3D5E]">
      <div className="w-full px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/stratford%20logo.png"
            alt="Stratford logo"
            width={32}
            height={32}
            className="shrink-0 rounded-lg"
            priority
          />
          <strong className="hidden uppercase tracking-wide whitespace-nowrap sm:inline md:text-base">
            STRATFORD INTERNATIONAL SCHOOL E-BOTO
          </strong>
          <strong className="uppercase tracking-wide text-sm whitespace-nowrap sm:hidden">
            SIS E-BOTO
          </strong>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex sm:flex-wrap">
          <NavLinks />
        </nav>

        {/* Mobile hamburger toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="rounded-md p-2 hover:bg-white/10 sm:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6l-12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-[#0C3D5E] px-4 py-2 sm:hidden">
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </nav>
      )}
    </header>
  );
}
