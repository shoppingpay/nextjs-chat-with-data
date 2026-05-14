import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  title: string;
};

export function EmptyState({
  action,
  className,
  description,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-44 flex-col items-center justify-center rounded-[10px] border border-dashed border-[#30363d] bg-[#0f141b] px-6 py-8 text-center",
        className,
      )}
    >
      <div className="mb-4 h-2 w-16 rounded-full bg-[#1d9e75]" />
      <h3 className="text-sm font-semibold text-[#e6edf3]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#8b949e]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
