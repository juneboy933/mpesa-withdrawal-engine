import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateWithdrawalDto {
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(10, { message: 'Minimum withdrawal amount is KES 10' })
  amount!: number;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+254[0-9]{9}$/, {
    message: 'phone_number must be in format +2547xxxxxxxx',
  })
  phone_number!: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
