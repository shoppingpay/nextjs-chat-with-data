@AGENTS.md



\## AI Chat Integration

See docs/PROJECT\_SUMMARY.md for full project context.

See docs/implementation-plan.md for phase-by-phase plan.

See docs/system-architecture-v2.md for architecture details.



\## Key files (do NOT modify)

\- src/lib/session-store.ts → getSessionByToken()

\- src/lib/api-security.ts → isSameOriginRequest()

\- Use src/backend/audit-log/ as pattern reference for new modules



\## New files go here

\- src/backend/chat/ (ChatModule, Controller, Service, Worker, Guard)

\- src/app/(protected)/chat/page.tsx



\## Rules

\- Do NOT modify any existing files unless explicitly asked

\- Follow AuditLogModule pattern for new NestJS modules

\- Commit after each Phase completes

\- After each Phase commit, update docs/PROGRESS.md with: commit hash, date, files created/modified, and Definition of Done checklist status

