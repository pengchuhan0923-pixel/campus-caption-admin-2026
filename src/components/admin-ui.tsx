export function PageHeader({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return <header><p className="text-xs font-black uppercase tracking-[.25em] text-emerald-700">{eyebrow}</p><h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-6xl">{title}</h1><p className="mt-4 max-w-3xl leading-7 text-slate-600">{note}</p></header>;
}
export function Notice({ success, error }: { success?: string; error?: string }) {
  const message = error ?? success; if (!message) return null;
  return <p className={`mt-6 border p-4 font-bold ${error ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>{message}</p>;
}
export function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <section className="mt-7 border border-[#d8d0c2] bg-[#fffdf8] p-5 sm:p-7"><div className="mb-5"><h2 className="text-2xl font-black">{title}</h2>{note && <p className="mt-1 text-sm text-slate-500">{note}</p>}</div>{children}</section>;
}
export const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
export const buttonClass = "rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700";
export function Empty({ children = "No records yet." }: { children?: React.ReactNode }) { return <p className="border border-dashed border-slate-300 p-6 text-center text-slate-500">{children}</p>; }
export function DeleteFields() { return <><input name="confirmation" required placeholder="Type DELETE" className={inputClass}/><button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-black text-white">Delete</button></>; }
