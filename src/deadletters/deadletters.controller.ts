import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { DeadlettersService } from './deadletters.service';

@Controller('admin/deadletters')
export class DeadlettersController {
  constructor(private readonly deadLetters: DeadlettersService) {}

  @Get()
  unresolvedDeadletters(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deadLetters.getUnresolved(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Patch(':id/resolve')
  resolveDeadLetters(@Param('id') id: string) {
    return this.deadLetters.resolve(id);
  }
}
