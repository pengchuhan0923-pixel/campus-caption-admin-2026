import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";

const navigation = [
  ["Overview", "/admin", "⌁"],
  ["Profiles", "/admin/profiles", "◎"],
  ["AI Media", "/admin/media", "◇"],
  ["Votes", "/admin/votes", "↕"],
  ["Prompt Ops", "/admin/prompting", "⎇"],
  ["Generations", "/admin/generations", "✦"],
  ["LLM Registry", "/admin/llm", "⌘"],
  ["Access Lists", "/admin/access", "⊙"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSuperadmin();
  return (
    <div className="min-h-screen bg-[#f3efe7] text-[#111827] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-[#07111f] p-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/admin" className="flex items-center gap-3 px-2 py-2">
          <span className="grid h-11 w-11 -rotate-3 place-items-center rounded-xl bg-amber-300 text-xl font-black text-slate-950">CC</span>
          <strong className="leading-4">Caption<br/>Control</strong>
        </Link>
        <nav className="mt-5 grid grid-cols-4 gap-1 lg:mt-12 lg:flex lg:flex-col lg:overflow-y-auto">
          {navigation.map(([label, href, icon]) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white lg:flex-row lg:gap-3 lg:px-4 lg:text-sm">
              <span className="text-lg text-emerald-300">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 pt-5 lg:block">
          <p className="text-xs uppercase tracking-[.2em] text-slate-500">Superadmin</p>
          <strong className="mt-2 block">{profile.first_name ?? "Admin"} {profile.last_name ?? ""}</strong>
          <form action="/auth/signout" method="post"><button className="mt-4 text-sm font-bold text-slate-400 hover:text-white">Sign out →</button></form>
        </div>
      </aside>
      <main className="w-full min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
