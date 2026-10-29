import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getData', () => {
    it('should return API response with doctor user', () => {
      const appController = app.get<AppController>(AppController);
      const res = appController.getData();
      expect(res.success).toBe(true);
      expect(res.data.role).toBe('DOCTOR');
    });
  });
});
