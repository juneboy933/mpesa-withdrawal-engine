import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly account: AccountsService) {}

  @Post()
  createAccount(@Body() dto: CreateAccountDto) {
    return this.account.createAccount(dto);
  }

  @Get('user/:userId')
  getAccountByUserId(@Param('userId') userId: string) {
    return this.account.getAccountByUserId(userId);
  }

  @Get(':id')
  getAccountById(@Param('id') id: string) {
    return this.account.getAccountById(id);
  }

  @Get(':id/balance')
  getAccountBalance(@Param('id') id: string) {
    return this.account.getAccountBalance(id);
  }

  @Patch(':id/deactivate')
  deactivateAccount(@Param('id') id: string) {
    return this.account.deactivateAccount(id);
  }
}
