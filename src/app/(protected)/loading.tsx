import { PageSkeleton } from "@/components/skeleton";

export default function ProtectedLoading() {
  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e6edf3] lg:pl-64">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6 lg:px-6">
        <PageSkeleton />
      </div>
    </div>
  );
}
