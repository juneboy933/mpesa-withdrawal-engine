import { Prisma } from '@prisma/client';

export interface CreateLedgerEntryParam {
  transactionId: string;
  accountId: string;
  amount: Prisma.Decimal;
  balance_before: Prisma.Decimal;
  balance_after: Prisma.Decimal;
  description?: string;
}
