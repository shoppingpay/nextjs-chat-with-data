"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type UserRoleOption = "USER" | "ADMIN";

const roleOptions: Array<{ label: string; value: UserRoleOption }> = [
  { label: "User", value: "USER" },
  { label: "Admin", value: "ADMIN" },
];

type RoleSelectProps = {
  defaultValue?: UserRoleOption;
  disabled?: boolean;
  name: string;
};

export function RoleSelect({
  defaultValue = "USER",
  disabled = false,
  name,
}: RoleSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState<UserRoleOption>(defaultValue);
  const selected = roleOptions.find((option) => option.value === value);

  useEffect(() => {
    const form = rootRef.current?.closest("form");

    function handleFormReset() {
      setValue(defaultValue);
      setIsOpen(false);
    }

    form?.addEventListener("reset", handleFormReset);

    return () => {
      form?.removeEventListener("reset", handleFormReset);
    };
  }, [defaultValue]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <input name={name} type="hidden" value={value} />
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-md border border-[#30363d] bg-[#0f141b] px-3 text-left text-sm font-semibold text-[#e6edf3] transition hover:border-[#1d9e75] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/20",
          disabled && "cursor-not-allowed text-[#8b949e] opacity-80",
        )}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{selected?.label ?? "User"}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 transition", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && !disabled ? (
        <div
          className="absolute left-0 top-[52px] z-50 w-full overflow-hidden rounded-md border border-[#30363d] bg-[#0f141b] py-1 shadow-none"
          id={listboxId}
          role="listbox"
        >
          {roleOptions.map((option) => (
            <button
              aria-selected={option.value === value}
              className="flex h-8 w-full items-center px-3 text-left text-sm text-[#e6edf3] transition hover:bg-[#1d9e75] hover:text-white focus:bg-[#1d9e75] focus:text-white focus:outline-none"
              key={option.value}
              onClick={() => {
                setValue(option.value);
                setIsOpen(false);
              }}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
