import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/app/account/change-password/change-password-form";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getAuthenticatedUser({
    allowPasswordChangeRequired: true,
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.mustChangePassword) {
    redirect("/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">
            Change password
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Set a new password before continuing.
          </p>
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}
