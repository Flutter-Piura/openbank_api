import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class MoneyDto {
  @IsInt()
  @Min(1)
  minorUnits!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}

export class CreateTransferRequestDto {
  @IsUUID()
  sourceAccountId!: string;

  @IsUUID()
  destinationAccountId!: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  amount!: MoneyDto;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;
}

export class TransactionQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
