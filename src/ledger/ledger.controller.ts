import { Controller, Get, Param, Query } from '@nestjs/common';
import { LedgerService } from './ledger.service';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get(':accountId')
  getLedgerHistory(
    @Param('accountId') accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ledger.getLedgerHistory(
      accountId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':accountId/reconcile')
  reconcileLedger(@Param('accountId') accountId: string) {
    return this.ledger.reconcileAccount(accountId);
  }
}
