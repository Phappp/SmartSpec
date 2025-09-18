import { IsString, IsOptional, IsNotEmpty, IsArray, IsObject, ValidateNested } from 'class-validator';

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
    role: 'owner' | 'editor' | 'viewer';
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

// Request interfaces
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: {
    is_trashed?: boolean;
    trashed_at?: Date | null;
    delete_after_days?: number;
  };
  current_version?: string;
  members?: {
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
  }[];

  last_accessed_at?: Date;
}
