import { Injectable, Logger } from '@nestjs/common';
import { OutboxStatus, TransactionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  constructor(private readonly prisma: PrismaService) {}

  //   Get all pending events
  async getPendingEvents(limit = 10) {
    return await this.prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { created_at: 'asc' },
      take: limit,
    });
  }

  //   Mark event as successfully published to BullMQ
  async markPublished(eventId: string) {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxStatus.PUBLISHED,
        published_at: new Date(),
      },
    });
  }

  //   Mark event as failed after publish attempts exhausted
  async markFailed(eventId: string) {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxStatus.FAILED,
      },
    });

    this.logger.error(
      `Outbox ${eventId} failed to publish - requires manual intervention`,
    );
  }

  //   Update transaction status as QUEUED after successfully published
  async markTransactionQueued(transactionId: string) {
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.QUEUED,
      },
    });
  }
}
