import { redirectIfPasswordChangeRequired } from "@/lib/password-change-guard";

export default async function TrainModelPage() {
  await redirectIfPasswordChangeRequired();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Train model</h1>
        <p className="mt-2 text-sm text-slate-500">
          Prepare datasets, configure jobs, and track training progress.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Training workspace is ready.</p>
      </div>
    </section>
  );
}
