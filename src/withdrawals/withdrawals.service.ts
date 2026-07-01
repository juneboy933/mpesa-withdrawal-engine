import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from '../ledger/ledger.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { InitiateWithdrawalDto } from './dto/initiate-withdraw.dto';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly account: AccountsService,
    private readonly ledger: LedgerService,
  ) {}

  async initiateWithdrawal(dto: InitiateWithdrawalDto) {
    const idempotencyKey = dto.idempotency_key || uuidv4();
    const amount = new Prisma.Decimal(dto.amount);

    // Idempotency check — return existing transaction if same key
    const existing = await this.prisma.transaction.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    if (existing) {
      this.logger.log(
        `Duplicate request - returning existing transaction: ${existing.id}`,
      );
      return existing;
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Lock account row + validate balance
      const account = await this.account.validateWithdrawal(
        dto.accountId,
        amount,
        tx,
      );

      const balanceBefore = new Prisma.Decimal(account.balance);
      const newBalance = balanceBefore.minus(amount);
      const newLockedBalance = new Prisma.Decimal(account.locked_balance).plus(
        amount,
      );

      // Debit balance + lock amount
      await tx.account.update({
        where: { id: dto.accountId },
        data: {
          balance: newBalance,
          locked_balance: newLockedBalance,
          version: { increment: 1 },
        },
      });

      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          account_id: dto.accountId,
          idempotency_key: idempotencyKey,
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.PENDING,
          amount,
          phone_number: dto.phone_number,
          description: dto.description,
          currency: account.currency,
        },
      });

      // Write ledger DEBIT entry
      await this.ledger.debitLedgerEntry(tx, {
        transactionId: newTransaction.id,
        accountId: dto.accountId,
        amount,
        balance_before: balanceBefore,
        balance_after: newBalance,
        description: `Withdrawal initiated - ${dto.phone_number}`,
      });

      // Write outbox event — triggers async M-Pesa call
      await tx.outboxEvent.create({
        data: {
          event_type: 'WITHDRAWAL_INITIATED',
          transaction_id: newTransaction.id,
          payload: {
            transactionId: newTransaction.id,
            accountId: dto.accountId,
            amount: amount.toFixed(2),
            phoneNumber: dto.phone_number,
            currency: account.currency,
            idempotencyKey,
          },
        },
      });

      return newTransaction;
    });

    this.logger.log(
      `Withdrawal initiated: ${transaction.id} | Amount: ${amount.toFixed(2)} ${transaction.currency} | Phone: ${dto.phone_number}`,
    );

    return transaction;
  }

  async getTransaction(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        ledger_entries: {
          select: {
            id: true,
            entry_type: true,
            amount: true,
            balance_before: true,
            balance_after: true,
            created_at: true,
          },
        },
      },
    });

    if (!transaction)
      throw new NotFoundException(`Transaction ${id} not found`);

    return transaction;
  }

  async getTransactionHistory(
    accountId: string,
    page = 1,
    limit = 20,
    status?: TransactionStatus,
  ) {
    const account = await this.account.getAccountById(accountId);
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    // AND logic — transactions for this account only, optionally filtered by status
    const where: Prisma.TransactionWhereInput = {
      account_id: account.id,
      ...(status ? { status } : {}),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          currency: true,
          phone_number: true,
          mpesa_transaction_id: true,
          failure_reason: true,
          description: true,
          created_at: true,
          completed_at: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      account_id: accountId,
      pagination: {
        total,
        page,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
      },
      transactions,
    };
  }

  async markCompleted(
    transactionId: string,
    mpesaTransactionId: string,
    mpesaConversationId: string,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction)
      throw new NotFoundException(`Transaction ${transactionId} not found`);

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          mpesa_transaction_id: mpesaTransactionId,
          mpesa_conversation_id: mpesaConversationId,
          completed_at: new Date(),
        },
      });

      // Release locked balance — money has left, lock no longer needed
      await tx.account.update({
        where: { id: transaction.account_id },
        data: {
          locked_balance: { decrement: transaction.amount },
          version: { increment: 1 },
        },
      });
    });

    this.logger.log(
      `Transaction ${transactionId} completed - M-Pesa Ref: ${mpesaTransactionId}`,
    );
  }

  async markFailed(transactionId: string, reason: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction)
      throw new NotFoundException(`Transaction ${transactionId} not found`);

    if (transaction.status === TransactionStatus.COMPLETED)
      throw new BadRequestException('Cannot fail a completed transaction');

    if (transaction.status === TransactionStatus.FAILED) {
      this.logger.warn(
        `Transaction ${transactionId} is already failed - skipping duplicate failure handling`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const existingAccount = await tx.account.findUnique({
        where: { id: transaction.account_id },
        select: { balance: true, locked_balance: true },
      });

      if (!existingAccount) throw new NotFoundException('Account not found');

      const balanceBefore = new Prisma.Decimal(existingAccount.balance);
      const refundedBalance = balanceBefore.plus(transaction.amount);

      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.FAILED,
          failure_reason: reason,
        },
      });

      await tx.account.update({
        where: { id: transaction.account_id },
        data: {
          balance: refundedBalance,
          locked_balance: { decrement: transaction.amount },
          version: { increment: 1 },
        },
      });

      await this.ledger.creditLedgerEntry(tx, {
        transactionId,
        accountId: transaction.account_id,
        amount: new Prisma.Decimal(transaction.amount),
        balance_before: balanceBefore,
        balance_after: refundedBalance,
        description: `Withdrawal failed - refund: ${reason}`,
      });
    });

    this.logger.warn(`Transaction ${transactionId} failed - reason: ${reason}`);
  }
}
