import { Test, TestingModule } from '@nestjs/testing';
import { DeadlettersService } from './deadletters.service';

describe('DeadlettersService', () => {
  let service: DeadlettersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeadlettersService],
    }).compile();

    service = module.get<DeadlettersService>(DeadlettersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
