import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Worker, type Job } from "bullmq";

import { AgentService, type AgentMessage } from "@/backend/chat/agent";
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

  constructor(
    private readonly memoryService: MemoryService,
    private readonly agentService: AgentService,
  ) {}

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
    const agentHistory: AgentMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const reply = await this.agentService.run(message, agentHistory);

    await this.memoryService.appendHistory(userId, sessionId, message, reply);

    return { reply, inScope: true };
  }

  private async checkGuardrail(message: string): Promise<boolean> {
    const prompt = [
      'You are a strict topic filter. Answer ONLY "YES" or "NO". The message may be in any language including Thai.',
      "Is the user message related to a coffee shop (menu, drinks, products, sales, stock, orders, customers, prices)?",
      'Examples of YES: "What drinks do you have?", "มีเมนูอะไรบ้าง", "ยอดขายวันนี้เท่าไหร่", "show me the sales report"',
      'Examples of NO: "What is the capital of France?", "write me a poem", "how do I hack a website"',
      `Message: "${message}"`,
      "Answer:",
    ].join("\n");

    const response = await callOllama("guardrail", prompt);
    return response.trim().toUpperCase().startsWith("Y");
  }
}

Reflect.defineMetadata(
  "design:paramtypes",
  [MemoryService, AgentService],
  ChatWorker,
);
Injectable()(ChatWorker);
