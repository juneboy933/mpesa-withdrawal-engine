import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  //   Create Account
  async createAccount(dto: CreateAccountDto) {
    // Check if the account exists
    const existing = await this.prisma.account.findFirst({
      where: {
        OR: [{ user_id: dto.user_id }, { phone_number: dto.phone_number }],
      },
    });

    // If it exists throw an error
    if (existing) {
      if (existing.user_id === dto.user_id) {
        throw new ConflictException(
          `Account already exists for user_id ${dto.user_id}`,
        );
      }
      throw new ConflictException(
        `Phone number ${dto.phone_number} is already registered`,
      );
    }

    // If it does not exist create a new account
    const account = await this.prisma.account.create({
      data: {
        user_id: dto.user_id,
        phone_number: dto.phone_number,
        full_name: dto.full_name,
        currency: dto.currency,
      },
      select: {
        id: true,
        user_id: true,
        phone_number: true,
        full_name: true,
        balance: true,
        locked_balance: true,
        currency: true,
        is_active: true,
        created_at: true,
      },
    });

    // Return the relevant account details
    this.logger.log(`Account created: ${account.id} for user ${dto.user_id}`);
    return account;
  }

  //   Get account by ID
  async getAccountById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        phone_number: true,
        full_name: true,
        balance: true,
        locked_balance: true,
        currency: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account;
  }

  //   Get account by User ID
  async getAccountByUserId(userId: string) {
    const account = await this.prisma.account.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        phone_number: true,
        full_name: true,
        balance: true,
        locked_balance: true,
        currency: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!account)
      throw new NotFoundException(`No account found for user ${userId}`);

    return account;
  }

  //   Get balance
  async getAccountBalance(id: string) {
    const account = await this.getAccountById(id);

    const balance = new Decimal(account.balance);
    const locked = new Decimal(account.locked_balance);
    const available = balance.minus(locked);

    return {
      account_id: account.id,
      balance: account.balance,
      locked_balance: account.locked_balance,
      available_balance: available,
      currency: account.currency,
    };
  }

  //   Deactivate account
  async deactivateAccount(id: string) {
    const account = await this.getAccountById(id);

    if (!account.is_active)
      throw new BadRequestException('Account is already inactive');

    await this.prisma.account.update({
      where: { id },
      data: {
        is_active: false,
      },
    });

    return { message: `Account ${id} deactivated successfully.` };
  }

  // Validate for withdrawal
  async validateWithdrawal(
    accountId: string,
    amount: Decimal,
    tx: Prisma.TransactionClient,
  ) {
    const rows = await tx.$queryRaw<
      {
        id: string;
        balance: string;
        locked_balance: string;
        is_active: boolean;
        version: number;
        currency: string;
        phone_number: string;
        full_name: string;
      }[]
    >`
            SELECT id, balance, locked_balance, is_active, version, currency, phone_number, full_name
            FROM accounts
            WHERE id = ${accountId}
            FOR UPDATE
    `;

    if (!rows.length)
      throw new NotFoundException(`Account ${accountId} not found`);

    const account = rows[0];

    if (!account.is_active)
      throw new BadRequestException(
        `Account ${accountId} is not active and cannot process withdrawals.`,
      );

    const balance = new Decimal(account.balance);
    const locked = new Decimal(account.locked_balance);
    const available = balance.minus(locked);

    if (available.lessThan(amount))
      throw new BadRequestException(
        `Insufficient balance. Available: ${available.toFixed(2)} ${account.currency}`,
      );

    return {
      ...account,
      balance: new Decimal(account.balance),
      locked_balance: new Decimal(account.locked_balance),
      available_balance: available,
    };
  }
}
