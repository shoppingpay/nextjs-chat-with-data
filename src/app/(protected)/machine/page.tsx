import { redirectIfPasswordChangeRequired } from "@/lib/password-change-guard";

export default async function MachinePage() {
  await redirectIfPasswordChangeRequired();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Machine</h1>
        <p className="mt-2 text-sm text-slate-500">
          Monitor compute resources and machine availability.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">No machines registered yet.</p>
      </div>
    </section>
  );
}
