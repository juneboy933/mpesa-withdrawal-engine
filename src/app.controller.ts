import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { QueueService } from './queue/queue.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const dbHealthy = await this.prisma.$queryRaw`SELECT 1 as value`
      .then(() => true)
      .catch(() => false);

    const queueHealthy = await this.queueService.checkConnection();

    return {
      status: dbHealthy && queueHealthy ? 'ok' : 'degraded',
      database: dbHealthy ? 'ok' : 'failed',
      queue: queueHealthy ? 'ok' : 'failed',
    };
  }
}
