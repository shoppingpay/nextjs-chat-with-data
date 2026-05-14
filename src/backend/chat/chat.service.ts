import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Queue } from "bullmq";

import { createBullmqConnection } from "@/backend/chat/chat.env";
import {
  CHAT_QUEUE_NAME,
  type ChatJobData,
  type ChatJobResult,
} from "@/backend/chat/chat.types";

export type EnqueueResult = {
  jobId: string;
  sessionId: string;
  status: "queued";
};

export type JobResult =
  | { jobId: string; state: "queued" | "processing" }
  | { jobId: string; state: "completed"; result: ChatJobResult }
  | { jobId: string; state: "failed"; error: string };

export class ChatService {
  private readonly queue: Queue<ChatJobData, ChatJobResult>;

  constructor() {
    this.queue = new Queue<ChatJobData, ChatJobResult>(CHAT_QUEUE_NAME, {
      connection: createBullmqConnection(),
    });
  }

  async enqueue(
    userId: string,
    message: string,
    sessionId?: string,
  ): Promise<EnqueueResult> {
    const resolvedSessionId = sessionId ?? crypto.randomUUID();
    const job = await this.queue.add("process-message", {
      sessionId: resolvedSessionId,
      userId,
      message,
    });

    return {
      jobId: String(job.id),
      sessionId: resolvedSessionId,
      status: "queued",
    };
  }

  async getResult(userId: string, jobId: string): Promise<JobResult> {
    const job = await this.queue.getJob(jobId);

    if (!job || job.data.userId !== userId) {
      throw new NotFoundException(`Job ${jobId} not found.`);
    }

    const state = await job.getState();

    if (state === "completed") {
      return { jobId, state: "completed", result: job.returnvalue };
    }

    if (state === "failed") {
      return {
        jobId,
        state: "failed",
        error: job.failedReason ?? "Unknown error",
      };
    }

    return { jobId, state: state === "active" ? "processing" : "queued" };
  }
}

Reflect.defineMetadata("design:paramtypes", [], ChatService);
Injectable()(ChatService);
