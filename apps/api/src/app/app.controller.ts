import { Controller, Get } from '@nestjs/common';
import { ApiResponse, UserDto } from '@medical-proj/shared-models';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData(): ApiResponse<UserDto> {
    return this.appService.getData();
  }
}
