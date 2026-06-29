import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PAYOUT_QUEUE } from './constants/queue.constants';
import { WithdrawalsModule } from 'src/withdrawals/withdrawals.module';
import { QueueProcessor } from './queue.processor';
import { DeadlettersModule } from 'src/deadletters/deadletters.module';
import { MpesaModule } from 'src/mpesa/mpesa.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get('REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: PAYOUT_QUEUE,
    }),
    WithdrawalsModule,
    DeadlettersModule,
    MpesaModule,
  ],
  providers: [QueueService, QueueProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
