"use client";

import { useEffect, useRef } from "react";

import {
  normalizeIdleTimeoutMinutes,
  SESSION_IDLE_TIMEOUT_STORAGE_KEY,
  SESSION_IDLE_TIMEOUT_UPDATED_EVENT,
} from "@/lib/session-policy";

type SessionIdleTimeoutProviderProps = {
  timeoutMinutes: number;
};

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "click",
  "keydown",
  "scroll",
  "touchstart",
] as const;

const ACTIVITY_SYNC_THROTTLE_MS = 60 * 1000;

export function SessionIdleTimeoutProvider({
  timeoutMinutes,
}: SessionIdleTimeoutProviderProps) {
  const timeoutMinutesRef = useRef(timeoutMinutes);
  const timeoutIdRef = useRef<number | null>(null);
  const isSigningOutRef = useRef(false);
  const lastSyncedAtRef = useRef(0);

  useEffect(() => {
    timeoutMinutesRef.current = timeoutMinutes;
  }, [timeoutMinutes]);

  useEffect(() => {
    function clearIdleTimer() {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    }

    function logoutForIdleTimeout() {
      if (isSigningOutRef.current) {
        return;
      }

      isSigningOutRef.current = true;
      clearIdleTimer();
      void fetch("/api/session/logout", {
        method: "POST",
        credentials: "same-origin",
      })
        .catch(() => null)
        .finally(() => {
          window.location.assign("/login?reason=timeout");
        });
    }

    function resetIdleTimer() {
      clearIdleTimer();
      timeoutIdRef.current = window.setTimeout(
        logoutForIdleTimeout,
        timeoutMinutesRef.current * 60 * 1000,
      );
    }

    function syncActivity() {
      const now = Date.now();

      if (now - lastSyncedAtRef.current < ACTIVITY_SYNC_THROTTLE_MS) {
        return;
      }

      lastSyncedAtRef.current = now;
      void fetch("/api/session/activity", {
        method: "POST",
        credentials: "same-origin",
      }).then((response) => {
        if (response.status === 401 || response.status === 503) {
          logoutForIdleTimeout();
        }
      });
    }

    function handleActivity() {
      resetIdleTimer();
      syncActivity();
    }

    function applyTimeoutMinutes(value: unknown) {
      const normalized = normalizeIdleTimeoutMinutes(value);

      if (!normalized) {
        return;
      }

      timeoutMinutesRef.current = normalized;
      resetIdleTimer();
    }

    function handleLocalUpdate(event: Event) {
      const customEvent = event as CustomEvent<{ timeoutMinutes?: number }>;
      applyTimeoutMinutes(customEvent.detail?.timeoutMinutes);
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key !== SESSION_IDLE_TIMEOUT_STORAGE_KEY ||
        !event.newValue
      ) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as {
          timeoutMinutes?: number;
        };
        applyTimeoutMinutes(payload.timeoutMinutes);
      } catch {
        // Ignore malformed localStorage payloads.
      }
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    window.addEventListener(
      SESSION_IDLE_TIMEOUT_UPDATED_EVENT,
      handleLocalUpdate,
    );
    window.addEventListener("storage", handleStorage);

    resetIdleTimer();
    syncActivity();

    return () => {
      clearIdleTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener(
        SESSION_IDLE_TIMEOUT_UPDATED_EVENT,
        handleLocalUpdate,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
}
