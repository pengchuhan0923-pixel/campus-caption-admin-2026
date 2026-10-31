import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";

export default async function Profiles({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 12;
  const { supabase } = await requireSuperadmin();
  let query = supabase.from("profiles").select("id, first_name, last_name, is_superadmin, created_at", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (search) {
    const safe = search.replace(/[,%()]/g, "");
    query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
  }
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  return <>
    <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.25em] text-emerald-700">People, not payloads</p><h1 className="mt-3 text-5xl font-black tracking-[-.04em]">Profiles</h1><p className="mt-3 text-slate-500">A searchable, privacy-minded directory. Roles are read-only here.</p></div><span className="w-fit rounded-full border border-[#d8d0c2] px-4 py-2 text-sm font-bold">{count ?? 0} total</span></header>
    <form className="mt-8 flex flex-col gap-3 sm:flex-row" method="get"><input className="min-h-12 flex-1 border border-[#d8d0c2] bg-white px-4 outline-none focus:border-emerald-600" name="q" defaultValue={search} placeholder="Search first or last name"/><button className="rounded-xl bg-[#111827] px-6 py-3 font-black text-white">Search</button></form>
    {data?.length ? <div className="mt-5 overflow-x-auto border border-[#d8d0c2] bg-[#fffdf8]"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#eae4d9] text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Profile</th><th className="p-4">Role</th><th className="p-4">Joined</th><th className="p-4">Private identifier</th></tr></thead><tbody>{data.map(profile => { const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Incomplete profile"; return <tr key={profile.id} className="border-t border-[#e5ded2]"><td className="p-4"><strong>{name}</strong><small className="mt-1 block text-slate-500">{profile.first_name && profile.last_name ? "Profile complete" : "Name details missing"}</small></td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${profile.is_superadmin ? "bg-emerald-200 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>{profile.is_superadmin ? "Superadmin" : "Member"}</span></td><td className="p-4 text-slate-500">{new Date(profile.created_at).toLocaleDateString()}</td><td className="p-4 font-mono text-xs text-slate-500">{profile.id.slice(0, 8)}…{profile.id.slice(-4)}</td></tr> })}</tbody></table></div> : <section className="mt-5 border border-dashed border-[#aaa294] p-16 text-center"><h2 className="text-2xl font-black">No profiles found</h2><p className="mt-2 text-slate-500">Try a broader search. Nothing was changed.</p></section>}
    <nav className="mt-5 flex items-center justify-between text-sm font-bold"><Link aria-disabled={page === 1} className="aria-disabled:pointer-events-none aria-disabled:opacity-30" href={`?q=${encodeURIComponent(search)}&page=${Math.max(1, page - 1)}`}>← Previous</Link><span>Page {page} of {totalPages}</span><Link aria-disabled={page >= totalPages} className="aria-disabled:pointer-events-none aria-disabled:opacity-30" href={`?q=${encodeURIComponent(search)}&page=${Math.min(totalPages, page + 1)}`}>Next →</Link></nav>
  </>;
}
