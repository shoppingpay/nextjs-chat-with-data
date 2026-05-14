"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type UserPaginationProps = {
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  recordCount: number;
};

export function UserPagination({
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  recordCount,
}: UserPaginationProps) {
  return (
    <div className="flex flex-col gap-3 text-sm text-[#8b949e] sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {recordCount} record{recordCount === 1 ? "" : "s"}.
      </span>
      <div className="flex items-center gap-2">
        <button
          aria-label="Previous page"
          className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-md border border-[#30363d] bg-[#21262d] px-3 text-[#e6edf3] transition hover:bg-[#30363d] disabled:cursor-not-allowed disabled:text-[#59636e]"
          disabled={!hasPrevious}
          onClick={onPrevious}
          type="button"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Previous
        </button>
        <button
          aria-label="Next page"
          className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-md border border-[#30363d] bg-[#21262d] px-3 text-[#e6edf3] transition hover:bg-[#30363d] disabled:cursor-not-allowed disabled:text-[#59636e]"
          disabled={!hasNext}
          onClick={onNext}
          type="button"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
