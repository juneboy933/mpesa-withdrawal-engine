import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PAYOUT_QUEUE } from './constants/queue.constants';
import { Logger } from '@nestjs/common';
import { WithdrawalsService } from 'src/withdrawals/withdrawals.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Job } from 'bullmq';
import { PayloadInterface } from './interface/queue.interface';
import { TransactionStatus } from '@prisma/client';
import { DeadlettersService } from 'src/deadletters/deadletters.service';
import { MpesaService } from 'src/mpesa/mpesa.service';

@Processor(PAYOUT_QUEUE)
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    private readonly withdraw: WithdrawalsService,
    private readonly prisma: PrismaService,
    private readonly deadLetters: DeadlettersService,
    private readonly mpesa: MpesaService,
  ) {
    super();
  }

  //   Process the job
  async process(job: Job<PayloadInterface>) {
    const { transactionId, phoneNumber, amount, idempotencyKey } = job.data;

    this.logger.log(`Processing payout job ${job.id} - ${transactionId}`);

    // Update the transaction to processing
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.PROCESSING },
    });

    // Call M-Pesa B2C API
    const result = await this.mpesa.initiateB2C({
      transactionId,
      phoneNumber,
      amount,
      idempotencyKey,
    });

    // Store the conversation ID so we can match the async M-Pesa callback
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        mpesa_conversation_id: result.ConversationID,
      },
    });

    this.logger.log(
      `B2C initiated — transaction ${transactionId}, ConversationID: ${result.ConversationID}`,
    );

    // Job completes. Return the M-pesa conversation ID
    return { conversationId: result.ConversationID };
  }

  //   Failed Jobs record to dead letter table and refund user
  async onFailed(job: Job<PayloadInterface>, error: Error) {
    const { transactionId } = job.data;

    this.logger.error(
      `Payout job ${job.id} permanently failed after ${job.attemptsMade} attempts — ${error.message}`,
    );

    // Record failed job in dead letter table
    await this.deadLetters.record({
      transactionId: job.data.transactionId,
      jobType: job.name,
      jobData: JSON.stringify(job.data),
      failureReason: error instanceof Error ? error.message : String(error),
    });

    // Refund the user automatically
    await this.withdraw.markFailed(
      transactionId,
      `Payment failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
