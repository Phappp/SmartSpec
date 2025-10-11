import { IsNotEmpty, IsEmail, IsIn } from 'class-validator';

export class InviteMemberByEmailDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsIn(['editor', 'viewer'])
  role!: 'editor' | 'viewer';
}
