import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { InitiateWithdrawalDto } from './dto/initiate-withdraw.dto';
import { TransactionStatus } from '@prisma/client';

@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Post()
  initiateWithdrawal(@Body() dto: InitiateWithdrawalDto) {
    return this.withdrawals.initiateWithdrawal(dto);
  }

  @Get(':id')
  getTransaction(@Param('id') id: string) {
    return this.withdrawals.getTransaction(id);
  }

  @Get('account/:accountId')
  getHistory(
    @Param('accountId') accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TransactionStatus,
  ) {
    return this.withdrawals.getTransactionHistory(
      accountId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      status,
    );
  }
}
