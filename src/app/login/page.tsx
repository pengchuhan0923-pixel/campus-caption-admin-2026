"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GoogleCredentialResponse = {
  credential: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }): void;
          renderButton(
            element: HTMLElement,
            options: { theme: string; size: string; width: number },
          ): void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  async function handleGoogleCredential(response: GoogleCredentialResponse) {
    setMessage("Verifying your Google account…");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: response.credential,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/auth/callback");
  }

  function initializeGoogleButton() {
    const button = document.getElementById("google-sign-in-button");

    if (!button || !googleClientId) {
      setMessage("Google sign-in is not configured.");
      return;
    }

    if (!window.google || button.childElementCount > 0) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(button, {
      theme: "outline",
      size: "large",
      width: 320,
    });
  }

  useEffect(() => {
    const retry = window.setInterval(() => {
      const button = document.getElementById("google-sign-in-button");
      if (!button || !window.google || !googleClientId || button.childElementCount > 0) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(button, {
        theme: "outline",
        size: "large",
        width: 320,
      });
    }, 500);
    return () => window.clearInterval(retry);
  }, [googleClientId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
          Admin access only
        </p>
        <h1 className="mt-4 text-4xl font-bold">Sign in to Caption Control</h1>
        <p className="mt-4 leading-7 text-slate-300">
          Google verifies your identity. Database permissions verify that you are a superadmin.
        </p>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={initializeGoogleButton}
          onReady={initializeGoogleButton}
          onError={() => setMessage("Google sign-in could not load. Please refresh the page.")}
        />
        <div id="google-sign-in-button" className="mt-8 flex justify-center" />
        {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
      </section>
    </main>
  );
}
