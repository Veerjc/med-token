import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully (PostgreSQL).');
    } catch (error) {
      this.logger.warn(
        `Database connection failed during startup: ${(error as Error).message}. ` +
          `The server remains online, but database queries will fail until PostgreSQL is reachable. ` +
          `Run 'npm run docker:db:up' to start the local database container.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
