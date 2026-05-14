import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    reason?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const session = await getCurrentSession();
  const isTimeoutLogin = params.reason === "timeout";

  if (session && !isTimeoutLogin) {
    redirect("/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0e14] px-4 py-10">
      <section className="w-full max-w-md rounded-[10px] border border-[#21262d] bg-[#161b22] p-8 shadow-sm">
        <div className="mb-8 space-y-2">
          <div className="mb-5 inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-[#1d9e75] text-sm font-bold text-[#0a0e14]">
            M
          </div>
          <h1 className="text-2xl font-semibold text-[#e6edf3]">Login</h1>
          <p className="text-sm text-[#8b949e]">
            Sign in to access the model management workspace.
          </p>
        </div>
        <Suspense>
          <LoginForm
            initialCallbackUrl={params.callbackUrl}
            initialShowTimeoutMessage={isTimeoutLogin}
          />
        </Suspense>
      </section>
    </main>
  );
}
