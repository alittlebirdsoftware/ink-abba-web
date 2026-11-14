import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/AuthForms";
import { getOwner } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getOwner()) redirect("/admin");
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-bold">Owner sign-in</h1>
      <p className="mb-6 mt-2 text-muted">No password. We email you a link that signs you in.</p>
      <LoginForm />
    </div>
  );
}
