import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ApiKeyGuard } from './guard/api-key/api-key.guard';

@Module({
  providers: [AuthService, ApiKeyGuard],
  controllers: [AuthController],
  exports: [ApiKeyGuard],
})
export class AuthModule {}
