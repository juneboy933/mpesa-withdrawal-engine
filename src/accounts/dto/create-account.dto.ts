import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+254[0-9]{9}$/, {
    message: 'phone_number must be in format +254xxxxxxxx',
  })
  phone_number!: string;

  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
