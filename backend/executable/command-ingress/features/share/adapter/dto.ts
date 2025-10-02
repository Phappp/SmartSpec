import { IsNotEmpty, IsMongoId, IsIn } from 'class-validator';

export class InviteMemberDto {
  @IsNotEmpty()
  @IsMongoId()
  user_id!: string;

  @IsNotEmpty()
  @IsIn(['editor', 'viewer'])
  role!: 'editor' | 'viewer';
}