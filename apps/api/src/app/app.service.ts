import { Injectable } from '@nestjs/common';
import { ApiResponse, UserDto } from '@medical-proj/shared-models';

@Injectable()
export class AppService {
  getData(): ApiResponse<UserDto> {
    return {
      success: true,
      message: 'Medical API Gateway Online',
      data: {
        id: 'usr_01',
        email: 'doctor@care.hospital',
        role: 'DOCTOR',
        firstName: 'Sarah',
        lastName: 'Chen',
        createdAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
