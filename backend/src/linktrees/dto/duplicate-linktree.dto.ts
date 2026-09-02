import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class DuplicateLinktreeDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Slug must be at least 2 characters' })
  @MaxLength(50, { message: 'Slug must not exceed 50 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name?: string;
}
