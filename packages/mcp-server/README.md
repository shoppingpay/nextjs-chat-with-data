# MCP Server — Coffee Shop Tools

Standalone MCP (Model Context Protocol) server exposing two tools for the AI Chat backend:

- `search_coffee_knowledge` — vector search via Qdrant (embeddings from Ollama bge-m3)
- `get_sales_timeseries` — PostgreSQL time-series query (uses `date_trunc`)

The NestJS chat worker launches this server as a child process via stdio transport.

## Setup

```bash
cd packages/mcp-server
npm install
npm run build
```

## Environment

Reads the same `.env` as the root project (`OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_MODEL`, `QDRANT_URL`, `QDRANT_COLLECTION`, `DATABASE_URL`).

## Ingestion

Plain text and Markdown files only (PDF support deferred).

```bash
npm run ingest -- ../../docs/coffee-menu.md ../../docs/product-knowledge.txt
```

This will:
1. Read each file
2. Chunk into ~500 char overlapping windows
3. Embed each chunk via Ollama
4. Upsert into Qdrant collection (auto-created if missing)

## Standalone test

You can run the MCP server directly to verify it loads:

```bash
npm run dev
# Server will speak MCP protocol over stdio; press Ctrl+C to exit.
```

For real testing, use an MCP-compatible client or the NestJS chat backend.
