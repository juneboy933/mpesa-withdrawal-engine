import { Injectable, NotFoundException } from '@nestjs/common';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLedgerEntryParam } from './interface/ledger-entry.interface';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  //   Record debit ledger entry
  async debitLedgerEntry(
    tx: Prisma.TransactionClient,
    param: CreateLedgerEntryParam,
  ) {
    return tx.ledgerEntry.create({
      data: {
        transaction_id: param.transactionId,
        account_id: param.accountId,
        entry_type: LedgerEntryType.DEBIT,
        amount: param.amount,
        balance_before: param.balance_before,
        balance_after: param.balance_after,
        description: param.description || 'Withdrawal debit',
      },
    });
  }

  //   Record credit ledger entry
  async creditLedgerEntry(
    tx: Prisma.TransactionClient,
    param: CreateLedgerEntryParam,
  ) {
    return tx.ledgerEntry.create({
      data: {
        transaction_id: param.transactionId,
        account_id: param.accountId,
        entry_type: LedgerEntryType.CREDIT,
        amount: param.amount,
        balance_before: param.balance_before,
        balance_after: param.balance_after,
        description: param.description || 'Withdrawal refund',
      },
    });
  }

  //   Ledger history
  async getLedgerHistory(accountId: string, page = 1, limit = 20) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, full_name: true, currency: true },
    });

    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const response = await this.prisma.ledgerEntry.findMany({
      where: { account_id: account.id },
      orderBy: { created_at: 'desc' },
      skip,
      take: safeLimit,
      select: {
        id: true,
        entry_type: true,
        amount: true,
        balance_before: true,
        balance_after: true,
        description: true,
        created_at: true,
        transaction: {
          select: {
            id: true,
            status: true,
            type: true,
            mpesa_transaction_id: true,
          },
        },
      },
    });

    return response;
  }

  //   Reconcile account
  async reconcileAccount(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, full_name: true, currency: true, balance: true },
    });

    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    // Sum all debit entries
    const debits = await this.prisma.ledgerEntry.aggregate({
      where: { account_id: accountId, entry_type: LedgerEntryType.DEBIT },
      _sum: { amount: true },
    });

    // Sum all credit entries
    const credits = await this.prisma.ledgerEntry.aggregate({
      where: { account_id: accountId, entry_type: LedgerEntryType.CREDIT },
      _sum: { amount: true },
    });

    const totalDebit = new Prisma.Decimal(debits._sum.amount ?? 0);
    const totalCredit = new Prisma.Decimal(credits._sum.amount ?? 0);
    const ledgerBalance = totalCredit.minus(totalDebit);
    const accountBalance = new Prisma.Decimal(account.balance);

    const isBalanced = ledgerBalance.equals(accountBalance);

    return {
      account_id: accountId,
      account_balance: accountBalance,
      total_debits: totalDebit,
      total_credits: totalCredit,
      ledger_balance: ledgerBalance,
      is_balanced: isBalanced,
      discrepancy: isBalanced
        ? null
        : accountBalance.minus(ledgerBalance).toFixed(2),
      currency: account.currency,
    };
  }
}
