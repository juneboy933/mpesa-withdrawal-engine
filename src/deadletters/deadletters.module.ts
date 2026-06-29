import { Module } from '@nestjs/common';
import { DeadlettersService } from './deadletters.service';
import { DeadlettersController } from './deadletters.controller';

@Module({
  providers: [DeadlettersService],
  controllers: [DeadlettersController],
  exports: [DeadlettersService],
})
export class DeadlettersModule {}
