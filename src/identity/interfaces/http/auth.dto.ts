import { IsEmail, IsString, Length, MaxLength } from "class-validator";

export class LoginRequestDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}

export class RefreshRequestDto {
  @IsString()
  @Length(16, 4096)
  refreshToken!: string;
}
