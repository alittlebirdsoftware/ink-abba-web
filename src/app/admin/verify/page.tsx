import type { Metadata } from "next";
import { VerifyForm } from "@/components/admin/AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-bold">Finish signing in</h1>
      <p className="mb-6 mt-2 text-muted">Press the button to sign in on this device.</p>
      <VerifyForm token={token} />
    </div>
  );
}
