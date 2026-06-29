import { Test, TestingModule } from '@nestjs/testing';
import { DeadlettersController } from './deadletters.controller';

describe('DeadlettersController', () => {
  let controller: DeadlettersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeadlettersController],
    }).compile();

    controller = module.get<DeadlettersController>(DeadlettersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
