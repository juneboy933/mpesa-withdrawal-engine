import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { PAYOUT_QUEUE } from './constants/queue.constants';
import { Queue } from 'bullmq';
import { PayloadInterface } from './interface/queue.interface';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(@InjectQueue(PAYOUT_QUEUE) private readonly payoutQueue: Queue) {}

  async addPayoutJob(payload: PayloadInterface) {
    const job = await this.payoutQueue.add('process-payout', payload, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: false,
      removeOnFail: false,
    });

    this.logger.log(
      `Payout job ${job.id} added for transaction ${payload.transactionId}`,
    );

    return job;
  }
}
