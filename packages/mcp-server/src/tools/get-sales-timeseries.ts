import { pool } from "../lib/postgres.js";
import type { SalesTimeseriesRow, ToolResult } from "../types.js";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const FALLBACK_MESSAGE = "ไม่สามารถดึงข้อมูลยอดขายได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";

export const getSalesTimeseriesInputSchema = {
  type: "object",
  properties: {
    from: {
      type: "string",
      description: "วันเริ่มต้น (ISO 8601: YYYY-MM-DD หรือ YYYY-MM-DDTHH:MM:SSZ)",
    },
    to: {
      type: "string",
      description: "วันสิ้นสุด (ISO 8601)",
    },
    product: {
      type: "string",
      description: "ชื่อสินค้า (optional) — ถ้าไม่ระบุจะดึงทุกสินค้า",
    },
    bucket: {
      type: "string",
      enum: ["hour", "day", "week", "month"],
      description: "ช่วงเวลาที่จะ group (default: day)",
    },
  },
  required: ["from", "to"],
} as const;

export async function getSalesTimeseries(input: {
  from: string;
  to: string;
  product?: string;
  bucket?: "hour" | "day" | "week" | "month";
}): Promise<ToolResult<SalesTimeseriesRow[]>> {
  if (!ISO_DATE_PATTERN.test(input.from) || !ISO_DATE_PATTERN.test(input.to)) {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "from and to must be ISO 8601 date/datetime strings.",
      },
    };
  }

  const bucket = input.bucket ?? "day";
  const product = input.product?.trim() || null;

  try {
    const result = await pool().query<{
      day: Date;
      product_name: string;
      total_qty: string;
      total_amount: string;
    }>(
      `SELECT date_trunc($4::text, "createdAt") AS day,
              "productName" AS product_name,
              SUM(quantity)::text AS total_qty,
              SUM(amount)::text AS total_amount
       FROM "Sale"
       WHERE "createdAt" BETWEEN $1::timestamptz AND $2::timestamptz
         AND ($3::text IS NULL OR "productName" = $3)
       GROUP BY 1, 2
       ORDER BY 1, 2`,
      [input.from, input.to, product, bucket],
    );

    const rows: SalesTimeseriesRow[] = result.rows.map((row) => ({
      day: row.day.toISOString(),
      productName: row.product_name,
      totalQty: Number(row.total_qty),
      totalAmount: Number(row.total_amount),
    }));

    return { success: true, data: rows };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "DB_ERROR",
        message: (error as Error).message,
        fallback: FALLBACK_MESSAGE,
      },
    };
  }
}
