"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginFormProps = {
  initialCallbackUrl?: string;
  initialShowTimeoutMessage?: boolean;
};

type LoginAttemptStatus = {
  isLocked: boolean;
  lockMinutes: number;
  remainingAttempts: number;
  retryAfterSeconds: number;
  scope?: "username" | "ip" | "identity";
};

const autofillDarkStyle = {
  WebkitBoxShadow: "0 0 0 1000px #0f141b inset",
  WebkitTextFillColor: "#e6edf3",
  backgroundColor: "#0f141b",
  boxShadow: "0 0 0 1000px #0f141b inset",
  color: "#e6edf3",
} satisfies CSSProperties;

async function getLoginAttemptMessage(username: string) {
  const fallback = "Invalid username or password";

  const response = await fetch("/api/auth/login-attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  }).catch(() => null);

  if (!response?.ok) {
    return fallback;
  }

  const status = (await response.json().catch(() => null)) as
    | LoginAttemptStatus
    | null;

  if (!status) {
    return fallback;
  }

  if (status.isLocked) {
    const retryMinutes = Math.max(
      1,
      Math.ceil(status.retryAfterSeconds / 60),
    );

    if (status.scope === "ip") {
      return `Too many login attempts from this network. Try again in ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"}.`;
    }

    return `Too many failed login attempts. Try again in ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"}.`;
  }

  return `Invalid username or password. ${status.remainingAttempts} attempt${status.remainingAttempts === 1 ? "" : "s"} remaining before a ${status.lockMinutes}-minute lock.`;
}

export function LoginForm({
  initialCallbackUrl,
  initialShowTimeoutMessage = false,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTimeoutMessage] = useState(initialShowTimeoutMessage);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const cleanedLoginUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("reason");

    const query = params.toString();

    return query ? `/login?${query}` : "/login";
  }, [searchParams]);

  const timeoutMessage =
    showTimeoutMessage
      ? "Session expired due to inactivity. Please sign in again."
      : "";

  useEffect(() => {
    if (!initialShowTimeoutMessage) {
      return;
    }

    let isActive = true;

    void fetch("/api/session/logout", {
      method: "POST",
      credentials: "same-origin",
    })
      .catch(() => null)
      .finally(() => {
        if (isActive) {
          router.replace(cleanedLoginUrl, { scroll: false });
        }
      });

    return () => {
      isActive = false;
    };
  }, [cleanedLoginUrl, initialShowTimeoutMessage, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        callbackUrl:
          searchParams.get("callbackUrl") ?? initialCallbackUrl ?? "/home",
      }),
    }).catch(() => null);

    if (!result?.ok) {
      setIsLoading(false);
      setError(await getLoginAttemptMessage(username));
      return;
    }

    const data = (await result.json().catch(() => null)) as {
      redirectTo?: string;
    } | null;

    router.replace(data?.redirectTo ?? "/home");
    router.refresh();
  }

  return (
    <form className="space-y-5" method="post" onSubmit={handleSubmit}>
      {timeoutMessage ? (
        <div className="rounded-md border border-[#ef9f27]/35 bg-[#ef9f27]/10 px-4 py-3 text-sm text-[#ef9f27]">
          {timeoutMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-[#e24b4a]/35 bg-[#e24b4a]/10 px-4 py-3 text-sm text-[#ff7776]">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#e6edf3]" htmlFor="username">
          Username
        </label>
        <input
          autoComplete="username"
          className="autofill-dark h-11 w-full rounded-md border border-[#30363d] bg-[#0f141b] px-3 text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-2 focus:ring-[#1d9e75]/20"
          disabled={isLoading}
          id="username"
          name="username"
          required
          style={autofillDarkStyle}
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#e6edf3]" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="autofill-dark h-11 w-full rounded-md border border-[#30363d] bg-[#0f141b] px-3 pr-11 text-sm text-[#e6edf3] outline-none transition focus:border-[#1d9e75] focus:ring-2 focus:ring-[#1d9e75]/20"
            disabled={isLoading}
            id="password"
            name="password"
            required
            style={autofillDarkStyle}
            type={isPasswordVisible ? "text" : "password"}
          />
          <button
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={() => {
              setIsPasswordVisible((current) => !current);
            }}
            title={isPasswordVisible ? "Hide password" : "Show password"}
            type="button"
          >
            {isPasswordVisible ? (
              <Eye aria-hidden="true" className="h-4 w-4" />
            ) : (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <button
        className="h-11 w-full rounded-md bg-[#1d9e75] px-4 text-sm font-semibold text-[#0a0e14] transition hover:bg-[#35bd91] disabled:cursor-not-allowed disabled:bg-[#30363d] disabled:text-[#8b949e]"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
