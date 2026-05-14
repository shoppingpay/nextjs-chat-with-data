import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { SessionIdleTimeoutProvider } from "@/components/session-idle-timeout-provider";
import { getAuthenticatedUser } from "@/lib/auth";
import { getIdleTimeoutMinutes } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getAuthenticatedUser({
    allowPasswordChangeRequired: true,
  });

  if (!currentUser) {
    redirect("/login");
  }

  const timeoutMinutes = await getIdleTimeoutMinutes();

  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e6edf3]">
      <SessionIdleTimeoutProvider timeoutMinutes={timeoutMinutes} />
      <AppNav
        user={{
          department: currentUser.department,
          email: currentUser.email,
          position: currentUser.position,
          role: currentUser.role,
          username: currentUser.username,
        }}
      />
      <main className="w-full lg:pl-64">
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6 lg:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
