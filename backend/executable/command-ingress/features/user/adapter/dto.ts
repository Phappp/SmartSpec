import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
  validate,
  ValidationError,
  ValidateNested,
  IsInt,
  Min,
  Max,
  Matches,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
  isNotEmpty,
} from "class-validator";
import { Type, plainToInstance } from "class-transformer";
import { ValidationResult } from "../../../shared/validation";
import { ServiceResponse } from "../../../services/serviceResponse";
import { ResponseStatus } from "../../../services/serviceResponse";
import { isString } from "lodash";

export class RequestDto {
  async validate(): Promise<ValidationResult> {
    try {
      const validationErrors = await validate(this, {
        forbidUnknownValues: false,
      });

      if (validationErrors && validationErrors.length > 0) {
        return {
          ok: false,
          errors: validationErrors,
        };
      }

      return { ok: true, errors: [] };
    } catch (_: any) {
      return { ok: false, errors: [] };
    }
  }
}

@ValidatorConstraint({ name: "IsValidDob", async: false })
class IsValidDobConstraint implements ValidatorConstraintInterface {
  validate(dob: any, args: ValidationArguments) {
    if (!dob || typeof dob !== "object") return false;

    const { day, month, year } = dob;

    if (
      typeof day !== "number" ||
      typeof month !== "number" ||
      typeof year !== "number"
    ) {
      return false;
    }

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;

    // Check ngày hợp lệ thực sự (ví dụ 30/02 là invalid)
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  defaultMessage(args: ValidationArguments) {
    return "dob must be a valid date object { day, month, year }";
  }
}

@ValidatorConstraint({ name: "IsValidPassword", async: false })
class IsValidPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    // Kiểm tra độ dài
    if (!password || password.length < 10) {
      return false;
    }

    // Kiểm tra có ít nhất một số
    const hasNumber = /\d/.test(password);
    if (!hasNumber) {
      return false;
    }

    // Kiểm tra có ít nhất một chữ cái hoặc ký tự đặc biệt
    const hasLetterOrSpecialChar =
      /[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasLetterOrSpecialChar;
  }

  defaultMessage(args: ValidationArguments) {
    return "Password must be at least 10 characters long and contain at least one number and one letter or special character";
  }
}

export class UpdateProfileRequestBody extends RequestDto {
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @IsNotEmpty({ message: "Full name is required" })
  @IsString()
  name: string;

  @IsNotEmpty({ message: "Date of birth is required" })
  @Validate(IsValidDobConstraint)
  dob: { day: number; month: number; year: number };

  @IsOptional()
  @IsString()
  @Matches(/^(male|female|genderless|do not want to be specific|other)$/, {
    message: "Please select the appropriate gender",
  })
  gender: string;

  @IsString()
  @IsOptional()
  avatar_url?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  selectedModel?: string; // ✅ MỚI: Model LLM được user chọn

  constructor(body: any) {
    super();
    if (body) {
      this.email = body.email;
      this.name = body.name;
      this.gender = body.gender;
      if (body.dob) {
        this.dob = {
          day: body.dob.day,
          month: body.dob.month,
          year: body.dob.year,
        };
      }
      this.avatar_url = body.avatar_url;
      this.status = body.status;
      this.selectedModel = body.selectedModel; // ✅ MỚI: Thêm selectedModel
    }
  }

  public async validate(): Promise<ValidationResult> {
    // 1. Chạy các validation cơ bản từ decorator (@IsNotEmpty, @Length, @IsEmail,...)
    const initialResult = await super.validate();
    if (!initialResult.ok) {
      return initialResult;
    }

    return { ok: true, errors: [] };
  }
}
