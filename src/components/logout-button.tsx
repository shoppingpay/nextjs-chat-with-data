"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    await fetch("/api/session/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => null);

    window.location.assign("/login");
  }

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#30363d] bg-[#21262d] px-3 text-sm font-medium text-[#8b949e] shadow-sm transition hover:border-[#3b444d] hover:bg-[#262d35] hover:text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/30"
      disabled={isLoggingOut}
      onClick={handleLogout}
      type="button"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {isLoggingOut ? "Logging out..." : "Logout"}
    </button>
  );
}
