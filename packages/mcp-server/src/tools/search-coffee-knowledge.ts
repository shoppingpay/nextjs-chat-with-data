import { getQdrantCollection } from "../env.js";
import { embedText } from "../lib/embedding.js";
import { qdrant } from "../lib/qdrant.js";
import type { CoffeeKnowledgeHit, ToolResult } from "../types.js";

const FALLBACK_MESSAGE =
  "ขณะนี้ไม่สามารถค้นหาข้อมูลร้านกาแฟได้ กรุณาลองใหม่อีกครั้งหรือติดต่อเจ้าหน้าที่";

export const searchCoffeeKnowledgeInputSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "คำถามหรือข้อความที่ต้องการค้นหาจาก knowledge base ของร้านกาแฟ",
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description: "จำนวนผลลัพธ์ที่ต้องการ (default 5)",
    },
  },
  required: ["query"],
} as const;

export async function searchCoffeeKnowledge(input: {
  query: string;
  limit?: number;
}): Promise<ToolResult<CoffeeKnowledgeHit[]>> {
  const query = input.query?.trim();
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);

  if (!query) {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "query is required and must be non-empty.",
      },
    };
  }

  let vector: number[];
  try {
    vector = await embedText(query);
  } catch (error) {
    return {
      success: false,
      error: {
        code: "EMBEDDING_FAILED",
        message: (error as Error).message,
        fallback: FALLBACK_MESSAGE,
      },
    };
  }

  try {
    const result = await qdrant().search(getQdrantCollection(), {
      vector,
      limit,
      with_payload: true,
    });

    const hits: CoffeeKnowledgeHit[] = result.map((point) => ({
      text: String(point.payload?.text ?? ""),
      source: String(point.payload?.source ?? "unknown"),
      score: point.score ?? 0,
    }));

    return { success: true, data: hits };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "VECTORDB_UNAVAILABLE",
        message: (error as Error).message,
        fallback: FALLBACK_MESSAGE,
      },
    };
  }
}
