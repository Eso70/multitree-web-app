import { IsIn, IsString, Length, MaxLength } from 'class-validator';

export const CRM_LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'won',
  'lost',
] as const;

export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];

export class UpdateCrmLeadStatusDto {
  @IsIn(CRM_LEAD_STATUSES)
  status: CrmLeadStatus;
}

export class CreateCrmNoteDto {
  @IsString()
  @Length(1, 4000)
  body: string;
}

export class CreateCrmTagDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @IsString()
  @MaxLength(7)
  color: string;
}
