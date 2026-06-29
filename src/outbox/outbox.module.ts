import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { QueueModule } from 'src/queue/queue.module';
import { OutboxProcessor } from './outbox.processor';

@Module({
  imports: [QueueModule],
  providers: [OutboxService, OutboxProcessor],
  exports: [OutboxService],
})
export class OutboxModule {}
