import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07111f] px-6 text-white">
      <section className="max-w-2xl rounded-[2rem] border border-rose-300/20 bg-rose-300/10 p-10 text-center">
        <p className="text-sm font-black uppercase tracking-[.3em] text-rose-200">403 · Role denied</p>
        <h1 className="mt-5 text-4xl font-black sm:text-6xl">Google knows you. The control room doesn&apos;t.</h1>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-300">Your sign-in worked, but this profile is not marked as a superadmin. No administrative data was disclosed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Try another account</Link>
          <form action="/auth/signout" method="post"><button className="rounded-xl border border-white/20 px-5 py-3 font-black">Sign out</button></form>
        </div>
      </section>
    </main>
  );
}

