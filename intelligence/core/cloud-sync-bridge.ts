// Created by BBMW0 Technologies | bbmw0.com

import { OfflineAgentQueue, AgentTask } from "./offline-agent-queue";

interface SQSMessage {
  MessageId?: string;
  ReceiptHandle?: string;
  Body?: string;
}

interface CloudResult {
  taskId: string;
  result: unknown;
  success: boolean;
  error?: string;
}

export class CloudSyncBridge {
  isAvailable(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_REGION);
  }

  async pushPendingTasksToCloud(queue: OfflineAgentQueue): Promise<number> {
    if (!this.isAvailable()) {
      console.warn("[CloudSyncBridge] AWS credentials not configured, skipping cloud push.");
      return 0;
    }

    const queueUrl = process.env.OMNIORG_SQS_QUEUE_URL;
    if (!queueUrl) {
      console.warn("[CloudSyncBridge] OMNIORG_SQS_QUEUE_URL not set, skipping cloud push.");
      return 0;
    }

    let SQSClient: any;
    let SendMessageCommand: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sqsMod = require("@aws-sdk/client-sqs") as Record<string, unknown>;
      SQSClient = sqsMod["SQSClient"];
      SendMessageCommand = sqsMod["SendMessageCommand"];
    } catch {
      console.warn("[CloudSyncBridge] @aws-sdk/client-sqs not installed, skipping cloud push.");
      return 0;
    }

    const client = new SQSClient({ region: process.env.AWS_REGION });

    // Dequeue only important tasks (priority <= 5)
    const allPending = queue.dequeue(50);
    const tasks: AgentTask[] = allPending.filter((t) => t.priority <= 5);

    let pushed = 0;
    for (const task of tasks) {
      try {
        const cmd = new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(task),
          MessageAttributes: {
            agentId: { DataType: "String", StringValue: task.agentId },
            operation: { DataType: "String", StringValue: task.operation },
            priority: { DataType: "Number", StringValue: String(task.priority) },
          },
          MessageGroupId: task.agentId, // for FIFO queues
        });

        const response = await client.send(cmd);
        const messageId: string = response.MessageId ?? task.id;
        queue.markPushedToCloud(task.id, messageId);
        pushed++;
        console.log(`[CloudSyncBridge] Pushed task ${task.id} → SQS message ${messageId}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[CloudSyncBridge] Failed to push task ${task.id}: ${msg}`);
      }
    }

    return pushed;
  }

  async pullResultsFromCloud(queue: OfflineAgentQueue): Promise<number> {
    if (!this.isAvailable()) {
      console.warn("[CloudSyncBridge] AWS credentials not configured, skipping results pull.");
      return 0;
    }

    const resultsUrl = process.env.OMNIORG_SQS_RESULTS_URL;
    if (!resultsUrl) {
      console.warn("[CloudSyncBridge] OMNIORG_SQS_RESULTS_URL not set, skipping results pull.");
      return 0;
    }

    let SQSClient: any;
    let ReceiveMessageCommand: any;
    let DeleteMessageCommand: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sqsMod = require("@aws-sdk/client-sqs") as Record<string, unknown>;
      SQSClient = sqsMod["SQSClient"];
      ReceiveMessageCommand = sqsMod["ReceiveMessageCommand"];
      DeleteMessageCommand = sqsMod["DeleteMessageCommand"];
    } catch {
      console.warn("[CloudSyncBridge] @aws-sdk/client-sqs not installed, skipping results pull.");
      return 0;
    }

    const client = new SQSClient({ region: process.env.AWS_REGION });
    let processed = 0;

    // Poll up to 10 messages per call
    const receiveCmd = new ReceiveMessageCommand({
      QueueUrl: resultsUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 5,
    });

    const response = await client.send(receiveCmd);
    const messages: SQSMessage[] = response.Messages ?? [];

    for (const msg of messages) {
      if (!msg.Body) continue;

      let cloudResult: CloudResult;
      try {
        cloudResult = JSON.parse(msg.Body) as CloudResult;
      } catch {
        console.warn(`[CloudSyncBridge] Could not parse result message: ${msg.Body}`);
        continue;
      }

      if (cloudResult.success) {
        queue.markCompleted(cloudResult.taskId, cloudResult.result);
      } else {
        queue.markFailed(cloudResult.taskId, cloudResult.error ?? "Cloud execution failed");
      }

      // Delete the message from results queue
      if (msg.ReceiptHandle) {
        const deleteCmd = new DeleteMessageCommand({
          QueueUrl: resultsUrl,
          ReceiptHandle: msg.ReceiptHandle,
        });
        await client.send(deleteCmd);
      }

      processed++;
      console.log(`[CloudSyncBridge] Pulled result for task ${cloudResult.taskId} (success=${cloudResult.success})`);
    }

    return processed;
  }

  async syncBothDirections(queue: OfflineAgentQueue): Promise<{ pushed: number; pulled: number }> {
    const [pushed, pulled] = await Promise.all([
      this.pushPendingTasksToCloud(queue),
      this.pullResultsFromCloud(queue),
    ]);
    console.log(`[CloudSyncBridge] Sync complete, pushed: ${pushed}, pulled: ${pulled}`);
    return { pushed, pulled };
  }
}

export const cloudSyncBridge = new CloudSyncBridge();
