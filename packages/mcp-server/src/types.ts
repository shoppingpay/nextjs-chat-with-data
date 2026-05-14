export type ToolError = {
  code: string;
  message: string;
  fallback?: string;
};

export type ToolResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: ToolError };

export type CoffeeKnowledgeHit = {
  text: string;
  source: string;
  score: number;
};

export type SalesTimeseriesRow = {
  day: string;
  productName: string;
  totalQty: number;
  totalAmount: number;
};
