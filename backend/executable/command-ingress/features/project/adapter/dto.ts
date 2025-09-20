import { IsString, IsOptional, IsNotEmpty, IsArray, IsObject, ValidateNested, IsIn, IsMongoId, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

// DTO lồng nhau cho `members`
class MemberDto {
  @IsMongoId() // Validate đây là một ID hợp lệ của MongoDB
  @IsNotEmpty()
  user_id!: string;

  @IsEnum(['owner', 'editor', 'viewer']) // Validate giá trị của role
  @IsNotEmpty()
  role!: 'owner' | 'editor' | 'viewer';
}

// DTO lồng nhau cho `status`
class StatusDto {
  @IsOptional()
  @IsBoolean()
  is_trashed?: boolean;

  @IsOptional()
  @IsDateString()
  trashed_at?: Date | null;
}

// ======================================================

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty() // Description nên là bắt buộc khi tạo mới
  description!: string;

  // BỔ SUNG: Thêm các trường còn thiếu
  @IsOptional()
  @IsString()
  rawText?: string;

  @IsString()
  @IsIn(['vi-VN', 'en-US']) // Validate giá trị của language
  language!: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId() // Validate ID của version
  current_version?: string;

  // BỔ SUNG: Validate sâu vào mảng `members`
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) // Yêu cầu validate từng phần tử trong mảng
  @Type(() => MemberDto) // Chỉ định class DTO cho mỗi phần tử
  members?: MemberDto[];

  // BỔ SUNG: Validate sâu vào object `status`
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StatusDto)
  status?: StatusDto;

  @IsOptional()
  @IsDateString() // Validate ngày tháng
  last_accessed_at?: Date;
}

// XÓA BỎ: Các interface không còn cần thiết nữa
// export interface CreateProjectRequest { ... }
// export interface UpdateProjectRequest { ... }