import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { SessionPolicyForm } from "@/app/(protected)/admin/systemsetting/session-policy-form";
import { requireAdminPageUser } from "@/lib/admin";
import { getIdleTimeoutMinutes } from "@/lib/settings";

export default async function SystemSettingPage() {
  const admin = await requireAdminPageUser();

  if (!admin) {
    redirect("/home");
  }

  const idleTimeoutMinutes = await getIdleTimeoutMinutes();

  return (
    <section className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#e6edf3]">
          System setting
        </h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          Manage system-wide security and session behavior.
        </p>
      </div>

      <div className="rounded-[10px] border border-[#21262d] bg-[#161b22] p-5 shadow-sm">
        <SessionPolicyForm initialIdleTimeoutMinutes={idleTimeoutMinutes} />
      </div>

      <div className="rounded-[10px] border border-[#21262d] bg-[#161b22] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#e6edf3]">
              Audit log
            </h2>
            <p className="mt-2 text-sm text-[#8b949e]">
              Review authentication activity and login failures.
            </p>
          </div>
          <Link
            className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-md bg-[#1d9e75] px-4 text-xs font-semibold text-[#0a0e14] shadow-sm transition hover:bg-[#35bd91]"
            href="/admin/systemsetting/audit-log"
          >
            <ClipboardList aria-hidden="true" className="h-3.5 w-3.5" />
            View log
          </Link>
        </div>
      </div>
    </section>
  );
}
