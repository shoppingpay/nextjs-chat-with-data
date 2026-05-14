# Project Progress: AI Chat Integration

---

## Phase 1 — Core Pipeline
**Commit:** `cdfd31e`  
**Date:** 2026-05-14

### ไฟล์ที่สร้าง
| ไฟล์ | รายละเอียด |
|---|---|
| `src/backend/chat/chat.module.ts` | NestJS module definition |
| `src/backend/chat/chat.controller.ts` | `POST /api/chat` พร้อม InternalApiKeyGuard + SessionGuard |
| `src/backend/chat/chat.service.ts` | Sync pipeline: Guardrail (qwen) → Agent (gemma) ผ่าน Ollama |
| `src/backend/chat/session.guard.ts` | ตรวจ session cookie ผ่าน `getSessionByToken()` |
| `src/backend/chat/chat.env.ts` | อ่าน `OLLAMA_*` env vars แยกจาก `src/lib/env.ts` |

### ไฟล์ที่แก้ไข
| ไฟล์ | รายละเอียด |
|---|---|
| `src/backend/app.module.ts` | เพิ่ม `ChatModule` import |
| `tsconfig.backend.json` | เพิ่ม `session-store`, `redis`, `settings`, `prisma` ใน include |

### Definition of Done
- [x] Guardrail กรอง off-topic ออกได้
- [x] Agent ตอบ in-scope questions ได้
- [ ] Response time < 15s — ทดสอบได้เมื่อ Ollama พร้อม

---

## Phase 2 — Memory & Queue
**Commit:** `40e40bf`  
**Date:** 2026-05-14

### ไฟล์ที่สร้าง
| ไฟล์ | รายละเอียด |
|---|---|
| `src/backend/chat/chat.types.ts` | Shared types/constants (`ChatJobData`, `ChatJobResult`, `CHAT_QUEUE_NAME`) |
| `src/backend/chat/ollama.ts` | `callOllama()` extracted เพื่อป้องกัน circular import |
| `src/backend/chat/memory.service.ts` | Redis history key `chat:{userId}:{sessionId}`, TTL 30min, max 20 messages |
| `src/backend/chat/chat.worker.ts` | BullMQ Worker: history → guardrail → agent+history → save history |

### ไฟล์ที่แก้ไข
| ไฟล์ | รายละเอียด |
|---|---|
| `src/backend/chat/chat.service.ts` | แทน sync pipeline ด้วย `enqueue()` + `getResult()` |
| `src/backend/chat/chat.controller.ts` | POST คืน `{jobId, sessionId}`, เพิ่ม `GET /api/chat/result/:jobId` |
| `src/backend/chat/chat.module.ts` | Register `MemoryService` + `ChatWorker` |
| `src/backend/chat/chat.env.ts` | เพิ่ม `createBullmqConnection()` (แยกจาก app redis singleton) |
| `package.json` | เพิ่ม `bullmq ^5.0.0` |

### Definition of Done
- [x] สนทนาต่อเนื่องได้ (Agent รู้บริบทจาก history)
- [x] Request คืน `jobId` ทันที (async)
- [ ] Poll `/api/chat/result/:jobId` จนได้คำตอบ — ทดสอบได้เมื่อ Ollama + Redis พร้อม

### Prerequisites ก่อนทดสอบ
```bash
npm install
docker compose -f docker-compose.phase2.yml up -d
# .env: REDIS_URL="redis://:nextjs-md-project-redis-dev-pass@localhost:6379"
# .env: OLLAMA_BASE_URL, OLLAMA_MAIN_MODEL, OLLAMA_GUARDRAIL_MODEL
npm run prisma:migrate && npm run prisma:seed
npm run backend:dev
```

---

## Phase 3 — MCP Server & RAG
**Status:** ยังไม่เริ่ม

---

## Phase 4 — Chat UI
**Status:** ยังไม่เริ่ม

---

## Phase 5 — Hardening
**Status:** ยังไม่เริ่ม
