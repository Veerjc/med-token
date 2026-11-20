import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [AuthModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}

/**
 * imports: [AuthModule]:  
Imports Passport strategies, JwtAuthGuard, and RolesGuard dependencies so that token parsing and role checks (@Roles(...)) function seamlessly across all protected doctor endpoints.

controllers: [DoctorsController]:  
Mounts the REST routes defined in DoctorsController under the global /api prefix.

providers: [DoctorsService] & exports: [DoctorsService]:  
Registers DoctorsService as an injectable provider within this module.
Exports DoctorsService so upcoming modules (such as Group 4: Sessions & Dynamic Capacity Engine and Group 5: Discovery & Token Booking) can inject and use doctor resolution methods directly.

PrismaModule Availability:  
Since PrismaModule was decorated with @Global() in Stage 5.1, PrismaService is automatically available for dependency injection into DoctorsService without needing to be re-imported here.
 * */
