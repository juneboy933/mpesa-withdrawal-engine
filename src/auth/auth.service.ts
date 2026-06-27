import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async createApiKey(name: string) {
    // 64 character random key
    const rawKey = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');

    // Hash the raw key
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Store name and hashed key
    const apiKey = await this.prisma.apiKey.create({
      data: { name, key_hash: keyHash },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      warning: 'Store this key securely. It cannot be retrieved again.',
    };
  }

  async listApiKeys() {
    return await this.prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        is_active: true,
        last_used_at: true,
        created_at: true,
      },
    });
  }

  async revokeApiKey(id: string) {
    // Find key using ID
    const key = await this.prisma.apiKey.findUnique({ where: { id } });

    if (!key) throw new NotFoundException('API key not found.');

    // Change is_active status to false - soft delete
    await this.prisma.apiKey.update({
      where: { id },
      data: {
        is_active: false,
      },
    });

    return { message: 'API key revoked successfully.' };
  }
}
