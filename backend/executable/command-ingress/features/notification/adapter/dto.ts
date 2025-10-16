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
  IsBoolean,
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

export class NotificationRequestBody extends RequestDto {
  @IsNotEmpty({ message: "Recipient is required" })
  @IsString()
  recipient_id: string;

  // @IsNotEmpty({ message: "Sender is required" })
  sender_id: string;

  @IsNotEmpty({ message: "Notify type is required" })
  @IsString()
  @Matches(/^(INVITATION|TESTCASE|PROJECT|RESPOND TO INVITATION|LEAVE THE PROJECT)$/, {
    message: "Notify type must be one of INVITATION, TESTCASE, PROJECT, RESPOND TO INVITATION, LEAVE THE PROJECT",
  })
  type: string;

  @IsNotEmpty({ message: "Title is required" })
  @IsString()
  @MinLength(3, { message: "Title must be at least 3 characters long" })
  title: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Message must be at least 3 characters long" })
  message?: string;

  @IsOptional()
  @IsString()
  link?: string;

  constructor(body: any) {
    super();
    if (body) {
      this.recipient_id = body.recipient_id;
      this.sender_id = body.sender_id;
      this.type = body.type;
      this.title = body.title;
      this.message = body.message;
      this.link = body.link;
    }
  }

  public async validate(): Promise<ValidationResult> {
    const initialResult = await super.validate();
    if (!initialResult.ok) {
      return initialResult;
    }

    return { ok: true, errors: [] };
  }
}
