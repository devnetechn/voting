// app/about/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "About Us — SIS E-Boto",
  description: "Meet the team behind Stratford International School E-Boto.",
};

type Member = {
  name: string;
  role: string;
  tags?: string[];
  img?: string; // path under /public
};

const TEAM: Member[] = [
  {
    name: "Everesto Cabasag",
    role: "Programmer",
    tags: ["Capstone Leader"],
    img: "/bars1.png",
  },
  {
    name: "Haidee S. Martizano",
    role: "Documentation Leader",
    img: "/diagan.png",
  },
  {
    name: "Ryan Dave S. Hulom",
    role: "Researcher",
    img: "/team/ryan.jpg",
  },
];

// Fallback avatar (initials) if an image is missing
function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-emerald-200 text-slate-700 font-semibold">
      {initials || "?"}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function TeamCard({ m }: { m: Member }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-4">
        {m.img ? (
          <Image
            src={m.img}
            alt={m.name}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
        ) : (
          <Initials name={m.name} />
        )}

        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-900">
            {m.name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-600">{m.role}</p>
          {m.tags && m.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {m.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AboutPage() {
  return (
    <>
      <Navbar />

      {/* HERO */}
      <header className="w-full bg-slate-50">
        <div className="mx-auto max-w-[1100px] px-6 pt-12 pb-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">
            About <span className="whitespace-nowrap">SIS E-Boto</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-slate-600">
            A secure, reliable, and fast school election platform crafted by the
            Cabasag Team for Stratford International School.
          </p>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-[1100px] px-6 pb-16">
        {/* Mission / Copy */}
        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold">Our Mission</h2>
            <p className="mt-2 text-sm text-slate-600">
              Empower student participation through a modern e-voting system
              that is safe, accessible, and easy to use—on any device.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold">What We Built</h2>
            <p className="mt-2 text-sm text-slate-600">
              A full-stack platform with authentication, department-based
              ballots, vote guarding, and an admin console for real-time
              monitoring.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold">Values</h2>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
              <li>Integrity &amp; transparency</li>
              <li>Security by design</li>
              <li>Reliability at scale</li>
              <li>Simple, friendly UX</li>
            </ul>
          </div>
        </section>

        {/* Team */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">The Cabasag Team</h2>
            <p className="text-sm text-slate-500">2025</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((m) => (
              <TeamCard key={m.name} m={m} />
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-6 text-center text-sm text-slate-500">
          © 2025 Cabasag Team. All rights reserved.
        </div>
      </footer>
    </>
  );
}
