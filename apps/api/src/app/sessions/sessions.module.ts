import { Module } from '@nestjs/common';
import { SessionController } from './sessions.controller';
import { SessionService } from './sessions.service';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [AuthModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionsModule {}
