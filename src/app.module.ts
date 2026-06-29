import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config/config.schema';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './auth/guard/api-key/api-key.guard';
import { AccountsModule } from './accounts/accounts.module';
import { LedgerModule } from './ledger/ledger.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { OutboxModule } from './outbox/outbox.module';
import { QueueModule } from './queue/queue.module';
import { DeadlettersModule } from './deadletters/deadletters.module';
import { MpesaModule } from './mpesa/mpesa.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    AuthModule,
    AccountsModule,
    LedgerModule,
    WithdrawalsModule,
    OutboxModule,
    QueueModule,
    DeadlettersModule,
    MpesaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
