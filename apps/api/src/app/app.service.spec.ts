import { Test } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getData', () => {
    it('should return API response with doctor user', () => {
      const result = service.getData();
      expect(result.success).toBe(true);
      expect(result.data.email).toBe('doctor@care.hospital');
    });
  });
});
