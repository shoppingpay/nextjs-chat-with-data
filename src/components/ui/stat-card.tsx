import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  helper: string;
  icon: ReactNode;
  label: string;
  tone?: "accent" | "slate";
  trend: string;
  value: string;
};

export function StatCard({
  helper,
  icon,
  label,
  tone = "slate",
  trend,
  value,
}: StatCardProps) {
  return (
    <article className="rounded-[10px] border border-[#21262d] bg-[#161b22] p-4 transition hover:border-[#30363d] hover:bg-[#1c2128]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#8b949e]">{label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-normal text-[#e6edf3]">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-lg",
            tone === "accent"
              ? "bg-[#1d9e75]/15 text-[#1d9e75]"
              : "bg-[#21262d] text-[#8b949e]",
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="rounded-md bg-[#1d9e75]/10 px-2.5 py-1 text-xs font-semibold text-[#1d9e75]">
          {trend}
        </span>
        <span className="truncate text-xs text-[#8b949e]">{helper}</span>
      </div>
    </article>
  );
}
