import Link from "next/link";
import { SettingsIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SystemSettingsButtonProps = {
  isActive?: boolean;
};

export function SystemSettingsButton({
  isActive = false,
}: SystemSettingsButtonProps) {
  return (
    <Link
      aria-label="System setting"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30",
        isActive
          ? "border-[#1d9e75] bg-[#1d9e75]/15 text-[#1d9e75] shadow-sm hover:bg-[#1d9e75]/15 hover:text-[#1d9e75]"
          : "border-[#30363d] bg-[#21262d] text-[#8b949e] shadow-sm hover:border-[#3b444d] hover:bg-[#262d35] hover:text-[#e6edf3]",
      )}
      href="/admin/systemsetting"
      title="System setting"
    >
      <SettingsIcon aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}
