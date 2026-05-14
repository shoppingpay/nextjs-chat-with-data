import { redirectIfPasswordChangeRequired } from "@/lib/password-change-guard";

export default async function AnalyticsPage() {
  await redirectIfPasswordChangeRequired();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Analytics</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review performance metrics and operational signals.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-72 rounded-md bg-slate-50" />
      </div>
    </section>
  );
}
