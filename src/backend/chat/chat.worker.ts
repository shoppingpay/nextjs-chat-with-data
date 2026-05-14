import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Worker, type Job } from "bullmq";

import { createBullmqConnection } from "@/backend/chat/chat.env";
import {
  CHAT_QUEUE_NAME,
  OFF_TOPIC_REPLY,
  type ChatJobData,
  type ChatJobResult,
} from "@/backend/chat/chat.types";
import { MemoryService } from "@/backend/chat/memory.service";
import { callOllama } from "@/backend/chat/ollama";

export class ChatWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatWorker.name);
  private worker: Worker | undefined;

  constructor(private readonly memoryService: MemoryService) {}

  onModuleInit() {
    this.worker = new Worker<ChatJobData, ChatJobResult>(
      CHAT_QUEUE_NAME,
      (job) => this.processJob(job),
      { connection: createBullmqConnection() },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Job ${job?.id ?? "?"} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async processJob(
    job: Job<ChatJobData, ChatJobResult>,
  ): Promise<ChatJobResult> {
    const { sessionId, userId, message } = job.data;

    const inScope = await this.checkGuardrail(message);

    if (!inScope) {
      return { reply: OFF_TOPIC_REPLY, inScope: false };
    }

    const history = await this.memoryService.getHistory(userId, sessionId);
    const reply = await this.generateReply(message, history);

    await this.memoryService.appendHistory(userId, sessionId, message, reply);

    return { reply, inScope: true };
  }

  private async checkGuardrail(message: string): Promise<boolean> {
    const prompt = [
      'You are a strict topic filter. Answer ONLY "YES" or "NO".',
      "Is the user message related to a coffee shop (menu, products, sales, stock, customers)?",
      `Message: "${message}"`,
      "Answer:",
    ].join("\n");

    const response = await callOllama("guardrail", prompt);
    return response.trim().toUpperCase().startsWith("YES");
  }

  private async generateReply(
    message: string,
    history: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const historyLines =
      history.length > 0
        ? [
            "Previous conversation:",
            ...history.map((m) =>
              m.role === "user"
                ? `User: ${m.content}`
                : `Assistant: ${m.content}`,
            ),
            "",
          ]
        : [];

    const prompt = [
      "You are a helpful coffee shop assistant. Answer in Thai unless the customer asks otherwise.",
      "Keep answers concise and grounded in coffee shop topics.",
      "",
      ...historyLines,
      `Customer: ${message}`,
      "Assistant:",
    ].join("\n");

    const reply = (await callOllama("main", prompt)).trim();
    return reply || "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
  }
}

Reflect.defineMetadata("design:paramtypes", [MemoryService], ChatWorker);
Injectable()(ChatWorker);
