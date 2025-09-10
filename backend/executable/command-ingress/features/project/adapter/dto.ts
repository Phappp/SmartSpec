import { IsString, IsOptional, IsNotEmpty, IsArray, IsObject } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  current_version?: string;

  @IsOptional()
  @IsArray()
  members?: {
    user_id: string;
    role?: 'owner' | 'editor' | 'viewer';
    status?: 'active' | 'inactive';
  }[];

  @IsOptional()
  @IsObject()
  status?: {
    is_trashed?: boolean;
    trashed_at?: Date | null;
    delete_after_days?: number;
  };

  @IsOptional()
  last_accessed_at?: Date;

}