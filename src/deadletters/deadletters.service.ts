import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeadlettersParams } from './interface/deadletters.interface';

@Injectable()
export class DeadlettersService {
  private readonly logger = new Logger(DeadlettersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(data: DeadlettersParams) {
    const job = await this.prisma.deadLetterJob.create({
      data: {
        transaction_id: data.transactionId,
        job_type: data.jobType,
        job_data: data.jobData,
        failure_reason: data.failureReason,
        failed_at: new Date(),
      },
    });

    this.logger.error(
      `Dead letter recorded — transaction: ${data.transactionId}, reason: ${data.failureReason}`,
    );

    return job;
  }

  async getUnresolved(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.deadLetterJob.findMany({
        where: { resolved: false },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deadLetterJob.count({ where: { resolved: false } }),
    ]);

    return {
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      jobs,
    };
  }

  async resolve(id: string) {
    return await this.prisma.deadLetterJob.update({
      where: { id },
      data: {
        resolved: true,
      },
    });
  }
}
