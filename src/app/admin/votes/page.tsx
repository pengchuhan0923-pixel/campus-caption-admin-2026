import { requireSuperadmin } from "@/lib/auth";

export default async function Votes() {
  const { supabase } = await requireSuperadmin();
  const { data, error } = await supabase.from("caption_votes").select("id, caption_id, user_id, vote, created_at, captions(text)").order("created_at", { ascending: false }).limit(250);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const up = rows.filter(row => row.vote === 1).length;
  const down = rows.length - up;
  const approval = rows.length ? Math.round(up / rows.length * 100) : 0;

  return <>
    <header><p className="text-xs font-black uppercase tracking-[.25em] text-emerald-700">Read-only audience intelligence</p><h1 className="mt-3 text-5xl font-black tracking-[-.04em]">The crowd&apos;s verdict</h1><p className="mt-3 max-w-2xl leading-7 text-slate-500">Observe ratings without rewriting them. This area intentionally has no update or delete controls.</p></header>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Votes inspected", rows.length], ["Upvotes", up], ["Downvotes", down], ["Approval", `${approval}%`]].map(([label, value], index) => <article key={label} className={`border p-5 ${index === 3 ? "border-slate-950 bg-emerald-300" : "border-[#d8d0c2] bg-[#fffdf8]"}`}><span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span><strong className="mt-3 block text-4xl font-black">{value}</strong></article>)}</section>
    {rows.length ? <div className="mt-5 overflow-x-auto border border-[#d8d0c2] bg-[#fffdf8]"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-[#eae4d9] text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Verdict</th><th className="p-4">Caption</th><th className="p-4">Anonymous voter</th><th className="p-4">Cast</th></tr></thead><tbody>{rows.map(row => { const related = Array.isArray(row.captions) ? row.captions[0] : row.captions; return <tr key={row.id} className="border-t border-[#e5ded2]"><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${row.vote === 1 ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-900"}`}>{row.vote === 1 ? "↑ Upvote" : "↓ Downvote"}</span></td><td className="max-w-lg p-4 font-serif text-base">“{related?.text ?? `Caption #${row.caption_id}`}”</td><td className="p-4 font-mono text-xs text-slate-500">{row.user_id.slice(0, 8)}…{row.user_id.slice(-4)}</td><td className="p-4 text-slate-500">{new Date(row.created_at).toLocaleString()}</td></tr> })}</tbody></table><p className="p-4 text-xs text-slate-500">Showing the 250 newest ratings. User identifiers are intentionally truncated.</p></div> : <section className="mt-8 border border-dashed border-[#aaa294] p-16 text-center"><h2 className="text-2xl font-black">No votes yet</h2><p className="mt-2 text-slate-500">The first community rating will appear here automatically.</p></section>}
  </>;
}
