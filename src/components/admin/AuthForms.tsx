"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui";

const inputClass = "mt-1.5 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base";

/** Asks for the owner's email and requests a sign-in link. */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setState("sent");
  }

  if (state === "sent") {
    return (
      <p role="status" className="rounded-xl bg-mist p-4 leading-relaxed">
        If <strong>{email}</strong> is an owner address, a sign-in link is on its way. It works once and expires in 15
        minutes.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="owner-email" className="block font-semibold">
        Your email
      </label>
      <input
        id="owner-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className={inputClass}
      />
      <button type="submit" className={`${buttonStyles.primary} mt-4 w-full`} disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email Me a Sign-in Link"}
      </button>
    </form>
  );
}

/**
 * Finishes sign-in. The link opens this button instead of signing in
 * directly, because mail scanners open links in advance and would otherwise
 * use up the one-time link before the owner clicks it.
 */
export function VerifyForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  async function signIn() {
    setState("working");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    if (response?.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setState("failed");
    }
  }

  if (state === "failed") {
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 font-semibold text-red-800">
        That link has been used or has expired.{" "}
        <Link href="/admin/login" className="underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }
  return (
    <button type="button" className={`${buttonStyles.primary} w-full`} onClick={signIn} disabled={state === "working"}>
      {state === "working" ? "Signing in…" : "Sign In"}
    </button>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm font-semibold text-muted hover:text-brand"
      onClick={async () => {
        await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null);
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
