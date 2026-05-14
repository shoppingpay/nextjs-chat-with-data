export const CHAT_QUEUE_NAME = "chat";
export const OFF_TOPIC_REPLY =
  "ขออภัย ฉันตอบได้เฉพาะเรื่องที่เกี่ยวกับร้านกาแฟ (เมนู, สินค้า, ยอดขาย, สต็อก) เท่านั้น";

export type ChatJobData = {
  sessionId: string;
  userId: string;
  message: string;
};

export type ChatJobResult = {
  reply: string;
  inScope: boolean;
};
