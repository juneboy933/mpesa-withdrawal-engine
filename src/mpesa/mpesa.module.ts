import { Module } from '@nestjs/common';
import { MpesaService } from './mpesa.service';
import { MpesaController } from './mpesa.controller';
import { WithdrawalsModule } from 'src/withdrawals/withdrawals.module';

@Module({
  imports: [WithdrawalsModule],
  providers: [MpesaService],
  controllers: [MpesaController],
  exports: [MpesaService],
})
export class MpesaModule {}
