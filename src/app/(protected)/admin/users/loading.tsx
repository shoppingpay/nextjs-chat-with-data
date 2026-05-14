import { TableSkeleton } from "@/components/skeleton";

export default function AdminUsersLoading() {
  return (
    <section className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded-md bg-[#161b22]" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-[#161b22]" />
      </div>
      <TableSkeleton />
    </section>
  );
}
