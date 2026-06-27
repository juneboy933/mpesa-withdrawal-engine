import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers['x-api-key'] as string;

    if (!rawKey) throw new UnauthorizedException('Missing x-api-key header');

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key_hash: keyHash },
    });

    if (!apiKey || !apiKey.is_active) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { last_used_at: new Date() },
      })
      .catch(() => null);

    return true;
  }
}
