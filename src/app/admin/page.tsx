import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";

export default async function Dashboard() {
  const { supabase } = await requireSuperadmin();
  const [{ data: profiles, error: profileError }, { data: captions, error: captionError }, { data: votes, error: voteError }] = await Promise.all([
    supabase.from("profiles").select("id, created_at"),
    supabase.from("captions").select("id, text, prompt, model, created_at").eq("is_ai_generated", true),
    supabase.from("caption_votes").select("caption_id, vote, created_at").order("created_at", { ascending: false }),
  ]);
  const error = profileError ?? captionError ?? voteError;
  if (error) throw new Error(error.message);

  const up = (votes ?? []).filter((vote) => vote.vote === 1).length;
  const down = (votes ?? []).length - up;
  const score = new Map<number, number>();
  (votes ?? []).forEach((vote) => score.set(vote.caption_id, (score.get(vote.caption_id) ?? 0) + vote.vote));
  const top = [...(captions ?? [])].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0))[0];
  const approval = votes?.length ? Math.round((up / votes.length) * 100) : 0;
  const referenceDate = new Date(votes?.[0]?.created_at ?? "2026-01-01T12:00:00Z");
  const referenceTime = referenceDate.getTime();
  const dailyVotes = (votes ?? []).reduce<number[]>((days, vote) => {
    const age = Math.floor((referenceTime - new Date(vote.created_at).getTime()) / 86400000);
    if (age >= 0 && age < 7) days[6 - age] += 1;
    return days;
  }, Array(7).fill(0));
  const maxDay = Math.max(1, ...dailyVotes);
  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(referenceDate); date.setDate(date.getDate() - (6 - index));
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });

  return <>
    <header className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
      <div><p className="text-xs font-black uppercase tracking-[.28em] text-emerald-700">Live community operations</p><h1 className="mt-4 text-5xl font-black leading-[.9] tracking-[-.05em] sm:text-7xl">Good comedy.<br/><span className="font-serif font-normal italic">Better signals.</span></h1></div>
      <Link href="/admin/media#new" className="rounded-full bg-[#111827] px-6 py-3 text-center font-black text-white shadow-[5px_5px_0_#34d399]">+ Create AI media</Link>
    </header>
    <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Community", profiles?.length ?? 0, "profiles"], ["AI media", captions?.length ?? 0, "generated captions"], ["Ratings", votes?.length ?? 0, "total verdicts"], ["Approval", `${approval}%`, `${up} up · ${down} down`]].map(([label, value, note], index) => <article key={label} className={`min-h-40 border p-6 ${index === 3 ? "border-slate-950 bg-amber-300 shadow-[5px_5px_0_#111827]" : "border-[#d8d0c2] bg-[#fffdf8]"}`}><p className="text-xs font-black uppercase tracking-[.15em] text-slate-500">{label}</p><strong className="mt-5 block text-5xl font-black">{value}</strong><p className="mt-2 text-sm text-slate-500">{note}</p></article>)}
    </section>
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <article className="border border-[#d8d0c2] bg-[#fffdf8] p-7"><p className="text-xs font-black uppercase tracking-[.2em] text-slate-500">Last seven days</p><h2 className="mt-2 text-2xl font-black">Crowd energy</h2><div className="mt-8 flex h-52 items-end gap-3 border-b border-[#d8d0c2]">{dailyVotes.map((value, index) => <div key={labels[index]} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><div className="mx-auto w-full max-w-12 bg-emerald-400" style={{ height: `${Math.max(4, value / maxDay * 100)}%` }}/><span className="pb-2 text-xs text-slate-500">{labels[index]}</span></div>)}</div></article>
      <article className="flex flex-col justify-between border border-fuchsia-300/30 bg-[#20132d] p-7 text-white"><div><p className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-300">Current top pick</p><blockquote className="mt-5 font-serif text-3xl leading-tight">“{top?.text ?? "The stage is waiting for its first winner."}”</blockquote></div><p className="mt-8 text-slate-300">Net score <strong className="text-2xl text-white">{top ? score.get(top.id) ?? 0 : 0}</strong></p></article>
    </section>
    <section className="mt-5 grid gap-4 md:grid-cols-3">{[["Profiles", "/admin/profiles", "Understand the people behind the feed."], ["AI media", "/admin/media", "Create, edit, inspect, and retire content."], ["Votes", "/admin/votes", "Read the latest audience decisions."]].map(([label, href, note]) => <Link key={href} href={href} className="border border-[#d8d0c2] bg-[#fffdf8] p-6 hover:-translate-y-1 hover:shadow-[5px_5px_0_#facc15]"><strong className="text-xl">{label} →</strong><p className="mt-2 text-sm leading-6 text-slate-500">{note}</p></Link>)}</section>
  </>;
}
