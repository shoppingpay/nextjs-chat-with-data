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
docker compose up -d
# .env: REDIS_URL="redis://:nextjs-md-project-redis-dev-pass@localhost:6379"
# .env: OLLAMA_BASE_URL, OLLAMA_MAIN_MODEL, OLLAMA_GUARDRAIL_MODEL
npm run prisma:migrate && npm run prisma:seed
npm run backend:dev
```

---

## Phase 3 — MCP Server & RAG
**Commit:** `569ea51`
**Date:** 2026-05-14

### ไฟล์ที่สร้าง

**Infrastructure**
| ไฟล์ | รายละเอียด |
|---|---|
| `docker-compose.yml` (updated) | เพิ่ม `qdrant-phase3` service (port 6333, persistent volume) |
| `prisma/schema.prisma` (updated) | เพิ่ม `Product` และ `Sale` models (Postgres standard, ใช้ `date_trunc`) |
| `.env.example` (updated) | เพิ่ม `OLLAMA_*`, `QDRANT_*`, `MCP_SERVER_*` vars |

**MCP Server (`packages/mcp-server/`)**
| ไฟล์ | รายละเอียด |
|---|---|
| `package.json` | Standalone Node.js project (`@modelcontextprotocol/sdk`, `@qdrant/js-client-rest`, `pg`) |
| `tsconfig.json` | Node16 ESM, target ES2022 |
| `README.md` | Setup + ingestion instructions |
| `src/index.ts` | MCP Server entry — registers tools, speaks stdio protocol |
| `src/types.ts` | `ToolResult<T>`, `CoffeeKnowledgeHit`, `SalesTimeseriesRow` |
| `src/env.ts` | env helpers |
| `src/lib/embedding.ts` | Ollama `bge-m3` embeddings |
| `src/lib/qdrant.ts` | Qdrant client + auto-create collection |
| `src/lib/postgres.ts` | pg Pool (max 4 connections) |
| `src/tools/search-coffee-knowledge.ts` | RAG: embed query → Qdrant search → top-k hits |
| `src/tools/get-sales-timeseries.ts` | SQL with `date_trunc()`, supports hour/day/week/month buckets |
| `scripts/ingest.ts` | Standalone: text/markdown → chunks (500 chars, 50 overlap) → embed → Qdrant upsert |

**NestJS Integration**
| ไฟล์ | รายละเอียด |
|---|---|
| `src/backend/chat/mcp-client.ts` | MCP Client wrapper — spawns mcp-server child process via stdio, lists+calls tools |
| `src/backend/chat/agent.ts` | Tool-aware agent — Ollama `/api/chat` with native `tools` parameter, max 4 tool iterations |
| `src/backend/chat/chat.worker.ts` (updated) | ใช้ `AgentService` แทน plain prompt loop |
| `src/backend/chat/chat.module.ts` (updated) | Register `McpClientService` + `AgentService` |
| `src/backend/chat/chat.env.ts` (updated) | เพิ่ม `getMcpServerCommand()`, `getMcpServerArgs()` |
| `package.json` (updated) | เพิ่ม `@modelcontextprotocol/sdk ^1.0.4` |

### Design choices
- **No TimescaleDB:** ใช้ `date_trunc('day', ...)` แทน `time_bucket()` ตามที่ user ระบุไว้ใน Phase 0
- **Native Ollama tool calling (no langchain):** ใช้ `/api/chat` พร้อม `tools` parameter (ต้องใช้ model ที่ support tools เช่น `qwen2.5+`, `llama3.1+`)
- **MCP graceful fallback:** ถ้า MCP server ขึ้นไม่ได้ → log error, agent ยัง work แต่ไม่มี tools
- **PDF ingestion deferred:** รองรับเฉพาะ `.txt`/`.md` ก่อน

### Definition of Done
- [ ] Ingest เอกสารเข้า Qdrant ได้ — ทดสอบได้เมื่อ Qdrant + Ollama พร้อม
- [ ] Agent เรียก `search_coffee_knowledge` ได้ — ขึ้นกับ tool-capable model
- [ ] Agent เรียก `get_sales_timeseries` ได้ — ต้องมีข้อมูลใน Sale table
- [ ] Tool error ถูก handle gracefully — ใช้ `ToolResult.success` + `fallback`

### Prerequisites ก่อนทดสอบ
```bash
# 1. Root deps
npm install

# 2. MCP server deps
cd packages/mcp-server && npm install && npm run build && cd ../..

# 3. Start infra (postgres + redis + qdrant)
docker compose up -d

# 4. Apply DB migration
npm run prisma:migrate

# 5. Switch Ollama models in .env to tool-capable ones (e.g. qwen2.5:7b)
# 6. Pull models: ollama pull qwen2.5:7b qwen2.5:0.5b bge-m3

# 7. Ingest knowledge base
cd packages/mcp-server && npm run ingest -- ../../docs/coffee-menu.md

# 8. Seed Sale table with sample data (manual or via Prisma seed)

# 9. Start backend
npm run backend:dev
```

---

## Phase 4 — Chat UI
**Commit:** `17510b8`
**Date:** 2026-05-14

### ไฟล์ที่สร้าง

**Next.js API Proxy Routes**
| ไฟล์ | รายละเอียด |
|---|---|
| `src/app/api/chat/route.ts` | POST proxy → NestJS `/api/chat`; ส่ง Cookie + x-internal-api-key; same-origin check |
| `src/app/api/chat/result/[jobId]/route.ts` | GET proxy → NestJS `/api/chat/result/:jobId`; forwards session cookie |

**Chat UI**
| ไฟล์ | รายละเอียด |
|---|---|
| `src/app/(protected)/chat/page.tsx` | Server Component — auth guard + user initials → renders ChatPanel |
| `src/app/(protected)/chat/chat-panel.tsx` | Client Component — welcome screen, suggestion cards, message list, typing indicator, BullMQ job polling (500ms interval, max 60 attempts) |

### ไฟล์ที่แก้ไข
| ไฟล์ | รายละเอียด |
|---|---|
| `src/components/app-nav.tsx` | เพิ่ม Chat nav item (MessageSquare icon, `/chat` route) |
| `src/app/globals.css` | เพิ่ม `@keyframes chat-in`, `@keyframes typing-dot`, `.chat-msg-in`, `.chat-input` utilities |

### Design
- Dark theme ตรง mockup: `--bg:#0a0e14`, `--accent:#1d9e75`
- Welcome screen พร้อม suggestion cards 4 ช่อง (2×2 grid)
- Message bubbles: user (green tint, right-aligned) / AI (dark surface, left-aligned)
- Typing indicator (3 dots bounce animation) ระหว่าง polling
- "+ New chat" button ใน topbar (แสดงเมื่อมีข้อความ)
- Session continuity: `sessionId` ถูกส่งกลับไปในทุก request เพื่อ multi-turn conversation
- Full-height layout: `height: calc(100vh - 59px)` ปรับตาม sticky header

### Definition of Done
- [x] ส่งข้อความได้ผ่าน POST `/api/chat`
- [x] Poll `/api/chat/result/:jobId` จนได้คำตอบ
- [x] Typing indicator แสดงระหว่างรอ
- [x] Welcome screen + suggestion cards ก่อนเริ่มสนทนา
- [x] New chat button รีเซต session
- [x] Error handling (timeout, failed job, network error)
- [ ] ทดสอบ end-to-end — ต้องมี Ollama + Redis พร้อม

---

## Phase 5 — Hardening
**Commit:** `c1a8543`
**Date:** 2026-05-14

### ไฟล์ที่สร้าง
| ไฟล์ | รายละเอียด |
|---|---|
| `src/backend/chat/chat-throttler.guard.ts` | ThrottlerGuard subclass — ใช้ `userId` เป็น throttle key (fallback: IP) |
| `src/backend/health/health.service.ts` | ตรวจสอบ Postgres, Redis, Ollama, Qdrant แบบ parallel; timeout 2s ต่อ service |

### ไฟล์ที่แก้ไข
| ไฟล์ | รายละเอียด |
|---|---|
| `src/backend/app.module.ts` | Import `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])` |
| `src/backend/chat/chat.module.ts` | เพิ่ม `ChatThrottlerGuard` ใน providers |
| `src/backend/chat/chat.controller.ts` | Apply `ChatThrottlerGuard` + `@Throttle({ default: { limit: 20, ttl: 60000 } })` บน POST; `@SkipThrottle` บน GET result |
| `src/backend/health/health.controller.ts` | Inject `HealthService`, return detailed check response |
| `src/backend/health/health.module.ts` | เพิ่ม `HealthService` ใน providers |
| `package.json` | เพิ่ม `@nestjs/throttler ^6` |

### Design choices
- **Rate limit key = userId**: authenticated users → ใช้ userId แทน IP เพื่อกันผู้ใช้หลายคนใน NAT เดียวกันถูก block พร้อมกัน
- **POST /api/chat throttle**: 20 req/min per user (1 request ทุก 3 วินาที)
- **GET /api/chat/result/:jobId**: SkipThrottle — polling endpoint ไม่ควรถูก throttle
- **Health checks**: postgres + redis + ollama + qdrant — ทุกตัวรัน parallel, timeout 2s; `ok: false` ถ้ามี service ใดล้มเหลว
- **CORS**: กำหนดใน main.ts ผ่าน `FRONTEND_ORIGIN` env var (ทำไว้ก่อนหน้าแล้ว)
- **Security headers**: helmet() ใน main.ts (ทำไว้ก่อนหน้าแล้ว)

### Definition of Done
- [x] `POST /api/chat` ถูก throttle ที่ 20 req/min ต่อ user
- [x] `GET /api/health` แสดงสถานะ postgres, redis, ollama, qdrant
- [x] Rate limit key ใช้ userId (ไม่ใช่ IP)
- [x] Polling endpoint ไม่ถูก throttle
- [ ] ทดสอบ rate limit ด้วย Ollama + Redis พร้อม
