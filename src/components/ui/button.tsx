import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[#1d9e75] bg-[#1d9e75] text-[#0a0e14] shadow-sm hover:border-[#35bd91] hover:bg-[#35bd91]",
  secondary:
    "border-[#30363d] bg-[#21262d] text-[#e6edf3] shadow-sm hover:border-[#3b444d] hover:bg-[#262d35]",
  ghost: "border-transparent bg-transparent text-[#8b949e] hover:bg-[#1c2128] hover:text-[#e6edf3]",
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30 disabled:pointer-events-none disabled:opacity-60",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
