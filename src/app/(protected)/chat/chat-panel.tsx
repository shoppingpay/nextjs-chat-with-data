"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type Props = {
  username: string;
  initials: string;
};

const SUGGESTIONS = [
  {
    desc: "ดูรายงานยอดขายรวมและแยกตามเมนู",
    icon: "📊",
    prompt: "ยอดขายวันนี้เป็นเท่าไหร่",
    title: "ยอดขายวันนี้",
  },
  {
    desc: "ตรวจสอบวัตถุดิบที่ต้องสั่งเพิ่ม",
    icon: "📦",
    prompt: "สต็อกสินค้าใกล้หมดมีอะไรบ้าง",
    title: "สต็อกใกล้หมด",
  },
  {
    desc: "ดูอันดับเมนูยอดนิยมของสัปดาห์",
    icon: "🏆",
    prompt: "เมนูไหนขายดีที่สุดสัปดาห์นี้",
    title: "เมนูขายดี",
  },
  {
    desc: "รายงานภาพรวมยอดขายและสต็อก",
    icon: "📋",
    prompt: "สรุปรายงานประจำสัปดาห์",
    title: "สรุปประจำสัปดาห์",
  },
] as const;

const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 500;

export function ChatPanel({ username, initials }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy, scrollToBottom]);

  function resizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setBusy(true);

    setMessages((prev) => [
      ...prev,
      {
        content: trimmed,
        id: crypto.randomUUID(),
        role: "user",
        timestamp: new Date(),
      },
    ]);

    let jobId: string;
    let newSessionId: string;

    try {
      const res = await fetch("/api/chat", {
        body: JSON.stringify({ message: trimmed, sessionId }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(err?.message ?? "ไม่สามารถส่งข้อความได้");
      }

      const data = (await res.json()) as { jobId: string; sessionId: string };
      jobId = data.jobId;
      newSessionId = data.sessionId;
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          content: `เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : "ไม่สามารถส่งข้อความได้"}`,
          id: crypto.randomUUID(),
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
      setBusy(false);
      return;
    }

    setSessionId(newSessionId);

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, POLL_INTERVAL_MS),
      );

      try {
        const res = await fetch(
          `/api/chat/result/${encodeURIComponent(jobId)}`,
          { credentials: "same-origin" },
        );

        if (!res.ok) continue;

        const data = (await res.json()) as {
          state: string;
          result?: { reply: string; inScope: boolean };
        };

        if (data.state === "completed" && data.result) {
          setMessages((prev) => [
            ...prev,
            {
              content: data.result!.reply,
              id: crypto.randomUUID(),
              role: "assistant",
              timestamp: new Date(),
            },
          ]);
          setBusy(false);
          textareaRef.current?.focus();
          return;
        }

        if (data.state === "failed") {
          setMessages((prev) => [
            ...prev,
            {
              content: "ไม่สามารถประมวลผลได้ กรุณาลองใหม่อีกครั้ง",
              id: crypto.randomUUID(),
              role: "assistant",
              timestamp: new Date(),
            },
          ]);
          setBusy(false);
          return;
        }
      } catch {
        // continue polling
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        content: "การประมวลผลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง",
        id: crypto.randomUUID(),
        role: "assistant",
        timestamp: new Date(),
      },
    ]);
    setBusy(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setSessionId(undefined);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    textareaRef.current?.focus();
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const hasMessages = messages.length > 0;

  return (
    <div
      className="flex flex-col overflow-hidden border-x-0 border-b-0 border-t border-[#21262d]"
      style={{ height: "calc(100vh - 59px)" }}
    >
      {/* Topbar */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[#21262d] bg-[#161b22] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">☕</span>
          <span className="text-sm font-semibold text-[#e6edf3]">
            Coffee Shop Assistant
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#1d9e75]/30 bg-[#1d9e75]/10 px-3 py-0.5 text-xs font-medium text-[#1d9e75]">
            AI · local
          </span>
          {hasMessages ? (
            <button
              className="rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-medium text-[#8b949e] transition hover:border-[#1d9e75]/40 hover:bg-[#1c2128] hover:text-[#e6edf3]"
              onClick={handleNewChat}
              type="button"
            >
              + New chat
            </button>
          ) : null}
        </div>
      </div>

      {/* Scroll area */}
      <div
        className="flex flex-1 flex-col overflow-y-auto"
        ref={scrollRef}
        style={{ scrollbarWidth: "thin", scrollbarColor: "#30363d transparent" }}
      >
        {!hasMessages ? (
          /* Welcome screen */
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#1d9e75]/22 bg-[#1d9e75]/10 text-2xl">
              ☕
            </div>
            <h2 className="mb-2 text-xl font-semibold text-[#e6edf3]">
              สวัสดี {username}
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-[#8b949e]">
              ถามเรื่องร้านกาแฟได้เลยครับ ยอดขาย สต็อก เมนู หรือข้อมูลในระบบ
            </p>
            <div className="mt-6 grid w-full max-w-lg grid-cols-2 gap-3">
              {SUGGESTIONS.map((s) => (
                <button
                  className="group rounded-xl border border-[#30363d] bg-[#161b22] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#1d9e75]/45 hover:bg-[#1c2128] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
                  disabled={busy}
                  key={s.prompt}
                  onClick={() => void sendMessage(s.prompt)}
                  type="button"
                >
                  <div className="mb-2 text-xl">{s.icon}</div>
                  <p className="mb-1 text-sm font-medium text-[#e6edf3]">
                    {s.title}
                  </p>
                  <p className="text-xs leading-relaxed text-[#8b949e]">
                    {s.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="flex flex-col gap-0.5 py-4">
            {messages.map((msg) => (
              <div
                className={`chat-msg-in flex gap-2.5 px-5 py-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                key={msg.id}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    msg.role === "assistant"
                      ? "border border-[#1d9e75]/22 bg-[#1d9e75]/10 text-[#1d9e75]"
                      : "border border-[#30363d] bg-[#21262d] text-[#8b949e]"
                  }`}
                >
                  {msg.role === "assistant" ? "M" : initials}
                </div>
                <div className="max-w-[580px]">
                  <div
                    className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed text-[#e6edf3] ${
                      msg.role === "assistant"
                        ? "border border-[#21262d] bg-[#161b22]"
                        : "border border-[#1d9e75]/20 bg-[#1d9e75]/10"
                    }`}
                  >
                    {msg.content
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line, i) => (
                        <p className="mb-1.5 last:mb-0" key={i}>
                          {line}
                        </p>
                      ))}
                  </div>
                  <p className="mt-1 text-[10px] text-[#8b949e]">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {busy ? (
              <div className="flex gap-2.5 px-5 py-3">
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#1d9e75]/22 bg-[#1d9e75]/10 text-[10px] font-bold text-[#1d9e75]">
                  M
                </div>
                <div className="rounded-xl border border-[#21262d] bg-[#161b22] px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#8b949e]"
                      style={{ animation: "typing-dot 1.2s infinite" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#8b949e]"
                      style={{
                        animation: "typing-dot 1.2s 0.2s infinite",
                      }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#8b949e]"
                      style={{
                        animation: "typing-dot 1.2s 0.4s infinite",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-[#21262d] bg-[#0a0e14] px-5 pb-5 pt-3">
        <div
          className={`flex items-end gap-2 rounded-xl border bg-[#161b22] px-4 py-2 transition ${
            busy
              ? "border-[#30363d] opacity-75"
              : "border-[#30363d] focus-within:border-[#1d9e75]/50"
          }`}
        >
          <textarea
            className="chat-input flex-1 resize-none text-sm leading-relaxed placeholder-[#8b949e] disabled:cursor-not-allowed"
            disabled={busy}
            maxLength={2000}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea(e.target);
            }}
            onKeyDown={handleKeyDown}
            placeholder="ถามเรื่องร้านกาแฟได้เลย..."
            ref={textareaRef}
            rows={1}
            value={input}
          />
          <button
            className={`mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base font-bold transition ${
              busy || !input.trim()
                ? "cursor-not-allowed bg-[#30363d] text-[#59636e]"
                : "bg-[#1d9e75] text-[#0a0e14] hover:bg-[#35bd91]"
            }`}
            disabled={busy || !input.trim()}
            onClick={() => void sendMessage(input)}
            type="button"
          >
            ↑
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-[#8b949e]">
          Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่
        </p>
      </div>
    </div>
  );
}
