import { IsEnum } from 'class-validator';

export enum ProfileChangeReviewAction {
  Approve = 'approve',
  Reject = 'reject',
}

export class ProfileChangeReviewDto {
  @IsEnum(ProfileChangeReviewAction)
  action!: ProfileChangeReviewAction;
}
