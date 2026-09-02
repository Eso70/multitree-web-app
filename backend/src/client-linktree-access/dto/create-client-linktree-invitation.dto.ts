import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateClientLinktreeInvitationDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(2)
  @MaxLength(100)
  clientLabel: string;
}
