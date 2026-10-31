"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="border border-rose-300 bg-rose-50 p-10 text-center"><p className="text-xs font-black uppercase tracking-[.25em] text-rose-700">Data connection interrupted</p><h1 className="mt-4 text-4xl font-black">The control room lost the signal.</h1><p className="mx-auto mt-4 max-w-xl text-slate-600">No changes were made. Check the database policies or try loading the page again.</p><button onClick={reset} className="mt-6 rounded-xl bg-[#111827] px-6 py-3 font-black text-white">Try again</button></section>;
}
