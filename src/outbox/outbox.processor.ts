import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from 'src/queue/queue.service';
import { PayloadInterface } from 'src/queue/interface/queue.interface';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);
  private isProcessing = false;

  constructor(
    private readonly outbox: OutboxService,
    private readonly queue: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox() {
    if (this.isProcessing) {
      this.logger.debug('Outbox processor already running - skipping');
      return;
    }

    this.isProcessing = true;

    try {
      const events = await this.outbox.getPendingEvents(10);
      if (events.length === 0) return;

      this.logger.log(`Processing ${events.length} outbox event(s)`);

      for (const event of events) {
        try {
          if (event.event_type === 'WITHDRAWAL_INITIATED') {
            await this.queue.addPayoutJob(
              event.payload as unknown as PayloadInterface,
            );
            await this.outbox.markPublished(event.id);

            if (event.transaction_id) {
              await this.outbox.markTransactionQueued(event.transaction_id);
            }

            this.logger.log(
              `Outbox event ${event.id} published — transaction ${event.transaction_id}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to publish outbox event ${event.id}: ${error}`,
          );
          await this.outbox.markFailed(event.id);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
