import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-[#1d9e75]/30 bg-[#1d9e75]/10 px-2.5 py-1 text-xs font-semibold text-[#1d9e75]",
        className,
      )}
    >
      {children}
    </span>
  );
}
