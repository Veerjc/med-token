import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ClinicsModule } from './clinics/clinics.module';
import { DoctorsModule } from './doctors/doctors.module';
import { SessionsModule } from './sessions/sessions.module';
import { TokensModule } from './tokens/tokens.module';
import { PaymentsModule } from './payments/payments.module';
import { QueueModule } from './queue/queue.module';
import { ConsultationsModule } from './consultations/consultations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    ClinicsModule,
    DoctorsModule,
    SessionsModule,
    TokensModule,
    PaymentsModule,
    QueueModule,
    ConsultationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

/**
 * Zero Module Sprawl: The root module remains lean and decoupled. Database concerns stay in PrismaModule, caching in RedisModule, and authentication logic in AuthModule.
 * Route Mounting: Once AuthModule is imported, NestJS automatically mounts all routes from AuthController under the /api prefix (configured via setGlobalPrefix('api') in main.ts):
 * POST http://localhost:3000/api/auth/send-otp
 * POST http://localhost:3000/api/auth/verify-otp
 * POST http://localhost:3000/api/auth/login
 */
