"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BrainCircuit,
  ChevronDown,
  Home,
  KeyRound,
  LogOut,
  MonitorCog,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

import {
  AccountPasswordDialog,
} from "@/components/account-password-dialog";
import {
  AccountProfileDialog,
  type AccountProfile,
} from "@/components/account-profile-dialog";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/train-model", icon: BrainCircuit, label: "Train model" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/machine", icon: MonitorCog, label: "Machine" },
];

const userMenuItemClass =
  "group flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm leading-6 text-[#8b949e] transition hover:bg-[#1d9e75] hover:text-white focus:bg-[#1d9e75] focus:text-white focus:outline-none";
const userMenuIconClass =
  "h-4 w-4 text-[#8b949e] transition group-hover:text-white group-focus:text-white";

type AppNavProps = {
  user: AccountProfile & {
    role: Role;
  };
};

export function AppNav({ user }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<AccountProfile>(user);
  const [profileError, setProfileError] = useState("");
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const initials =
    profile.username
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  async function handleAction(value: string) {
    if (!value) {
      return;
    }

    setIsUserMenuOpen(false);

    if (value === "logout") {
      if (isLoggingOut) {
        return;
      }

      setIsLoggingOut(true);

      await fetch("/api/session/logout", {
        method: "POST",
        credentials: "same-origin",
      }).catch(() => null);

      window.location.assign("/login");
      return;
    }

    router.push(value);
  }

  async function updateProfile(data: {
    department: string;
    email: string;
    position: string;
  }) {
    setProfileError("");
    setIsProfileSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await response.json().catch(() => null)) as {
        message?: string;
        user?: AccountProfile;
      } | null;

      if (!response.ok) {
        setProfileError(result?.message ?? "Unable to update profile.");
        return;
      }

      if (result?.user) {
        setProfile(result.user);
      }

      setIsProfileDialogOpen(false);
      router.refresh();
    } catch {
      setProfileError("Unable to update profile. Please try again.");
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function updatePassword(data: {
    currentPassword: string;
    newPassword: string;
  }) {
    setPasswordError("");
    setIsPasswordSaving(true);

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        setPasswordError(result?.message ?? "Unable to update password.");
        return;
      }

      setIsPasswordDialogOpen(false);
      router.refresh();
    } catch {
      setPasswordError("Unable to update password. Please try again.");
    } finally {
      setIsPasswordSaving(false);
    }
  }

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const navLinks = (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            className={cn(
              "group inline-flex items-center gap-3 border-r-2 border-transparent px-3 py-2.5 text-sm font-medium text-[#8b949e] transition hover:bg-[#1c2128] hover:text-[#e6edf3] lg:w-full",
              isActive &&
                "border-[#1d9e75] bg-[#1d9e75]/10 text-[#1d9e75] hover:bg-[#1d9e75]/10 hover:text-[#1d9e75]",
            )}
            href={item.href}
            key={item.href}
          >
            <span
              className={cn(
                "inline-flex w-5 shrink-0 items-center justify-center text-[#8b949e] transition",
                isActive && "text-[#1d9e75]",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#21262d] bg-[#161b22] py-4 shadow-none lg:flex lg:flex-col">
        <Link className="flex items-center gap-3" href="/home">
          <span className="ml-5 inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-[#1d9e75] text-[#0a0e14] shadow-sm">
            <Activity aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[#e6edf3]">
              Model Dashboard
            </span>
            <span className="block text-xs text-[#8b949e]">
              Operations workspace
            </span>
          </span>
        </Link>

        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main">
          {navLinks}
        </nav>

        <div className="border-t border-[#21262d] px-5 pt-4">
          <p className="text-xs font-medium uppercase text-[#8b949e]">Signed in</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#e6edf3]">
            {profile.username}
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-[#21262d] bg-[#161b22]/95 backdrop-blur lg:pl-64">
        <div className="flex min-h-[59px] w-full flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Link className="flex items-center gap-3" href="/home">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1d9e75] text-[#0a0e14] shadow-sm">
                <Activity aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-[#e6edf3]">
                Model Dashboard
              </span>
            </Link>
          </div>

          <nav
            className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
            aria-label="Main"
          >
            {navLinks}
          </nav>

          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-[#e6edf3]">
              Operations console
            </p>
            <p className="mt-1 text-xs text-[#8b949e]">
              System monitoring workspace
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <button
              aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-[#e6edf3] transition hover:bg-[#21262d]"
              title="Notifications"
              type="button"
            >
              <Bell aria-hidden="true" className="h-[18px] w-[18px]" />
              <span
                aria-hidden="true"
                className="absolute right-[7px] top-[7px] h-2.5 w-2.5 rounded-full border-2 border-[#161b22] bg-[#e24b4a]"
              />
            </button>

            <div className="relative" ref={userMenuRef}>
              <button
                aria-expanded={isUserMenuOpen}
                aria-label="User actions"
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-2 text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/20 disabled:opacity-60",
                  isUserMenuOpen
                    ? "border-[#1d9e75]/35 bg-[#1d9e75]/10"
                    : "border-transparent bg-transparent",
                )}
                disabled={isLoggingOut}
                onClick={() => setIsUserMenuOpen((current) => !current)}
                title="User actions"
                type="button"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1d9e75] text-xs font-bold leading-none text-[#0a0e14]">
                  {initials}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 transition",
                    isUserMenuOpen && "rotate-180 text-[#1d9e75]",
                  )}
                />
              </button>

              {isUserMenuOpen ? (
                <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-[10px] border border-[#30363d] bg-[#161b22] py-1 shadow-none">
                  <button
                    className={userMenuItemClass}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setProfileError("");
                      setIsProfileDialogOpen(true);
                    }}
                    type="button"
                  >
                      <UserRound
                        aria-hidden="true"
                        className={userMenuIconClass}
                      />
                      <span className="truncate font-semibold">
                        Profile
                      </span>
                  </button>

                  <button
                    className={userMenuItemClass}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setPasswordError("");
                      setIsPasswordDialogOpen(true);
                    }}
                    type="button"
                  >
                    <KeyRound aria-hidden="true" className={userMenuIconClass} />
                    Change password
                  </button>

                  {isAdmin ? (
                    <>
                      <button
                        className={userMenuItemClass}
                        onClick={() => {
                          void handleAction("/admin/users");
                        }}
                        type="button"
                      >
                        <UsersRound aria-hidden="true" className={userMenuIconClass} />
                        Manage users
                      </button>
                      <button
                        className={userMenuItemClass}
                        onClick={() => {
                          void handleAction("/admin/systemsetting");
                        }}
                        type="button"
                      >
                        <Settings aria-hidden="true" className={userMenuIconClass} />
                        System setting
                      </button>
                    </>
                  ) : null}

                  <button
                    className={userMenuItemClass}
                    onClick={() => {
                      void handleAction("logout");
                    }}
                    type="button"
                  >
                    <LogOut aria-hidden="true" className={userMenuIconClass} />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {isProfileDialogOpen ? (
        <AccountProfileDialog
          errorMessage={profileError}
          isSaving={isProfileSaving}
          onClose={() => {
            if (isProfileSaving) {
              return;
            }

            setIsProfileDialogOpen(false);
            setProfileError("");
          }}
          onSubmit={updateProfile}
          profile={profile}
        />
      ) : null}

      {isPasswordDialogOpen ? (
        <AccountPasswordDialog
          errorMessage={passwordError}
          isSaving={isPasswordSaving}
          onClose={() => {
            if (isPasswordSaving) {
              return;
            }

            setIsPasswordDialogOpen(false);
            setPasswordError("");
          }}
          onSubmit={updatePassword}
          username={profile.username}
        />
      ) : null}
    </>
  );
}
