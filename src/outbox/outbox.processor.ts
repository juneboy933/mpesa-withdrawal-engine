import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);
  private isProcessing = false;

  constructor(private readonly outbox: OutboxService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox() {
    if (this.isProcessing) {
      this.logger.debug('Outbox processor already runnning - skipping');
    }

    this.isProcessing = true;

    const events = await this.outbox.getPendingEvents(10);
    if (events.length === 0) return;

    this.logger.log(`Processing ${events.length} outbox event(s)`);

    for (const event of events) {
      try {
        if (event.event_type === 'WITHDRAWAL_INITIATED') {
          // Publish it to BullMQ

          // Mark event as published
          await this.outbox.markPublished(event.id);

          // Update the transaction status to QUEUED
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
      } finally {
        this.isProcessing = false;
      }
    }
  }
}
