import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('keys')
  createApiKey(@Body('name') name: string) {
    return this.auth.createApiKey(name);
  }

  @Get('keys')
  getApiKeys() {
    return this.auth.listApiKeys();
  }

  @Delete('keys/:id')
  deleteApiKey(@Param('id') id: string) {
    return this.auth.revokeApiKey(id);
  }
}
