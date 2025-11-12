// dtos/createSequenceDiagram.dto.ts

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  validate,
  ValidationError,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
  IsArray,
  IsMongoId,
  IsNumber,
  IsObject,
} from "class-validator";
import { ValidationResult } from "../../../../shared/validation";
import { isString } from "lodash";

/**
 * Lớp RequestDto cơ sở (Giữ nguyên)
 */
export class RequestDto {
  async validate(): Promise<ValidationResult> {
    try {
      const validationErrors = await validate(this, {
        forbidUnknownValues: false,
      });
      if (validationErrors && validationErrors.length > 0) {
        return { ok: false, errors: validationErrors };
      }
      return { ok: true, errors: [] };
    } catch (_: any) {
      return { ok: false, errors: [] };
    }
  }
}

function isEmpty(str: string): boolean {
  return !str || str.length === 0;
}

// --- Custom Validators cho Sequence Diagram ---

@ValidatorConstraint({ name: "AreLifelinesValid", async: false })
class AreLifelinesValidConstraint implements ValidatorConstraintInterface {
  validate(lifelines: any, args: ValidationArguments) {
    if (!Array.isArray(lifelines)) return false;
    const names = new Set();
    for (const line of lifelines) {
      if (!line || !isString(line.name) || isEmpty(line.name)) {
        return false;
      }
      if (names.has(line.name)) return false; // Tên lifeline phải là duy nhất
      names.add(line.name);
    }
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return "lifelines must be an array, each lifeline must have a unique, non-empty 'name' string";
  }
}

@ValidatorConstraint({ name: "AreFragmentsValid", async: false })
class AreFragmentsValidConstraint implements ValidatorConstraintInterface {
  validate(fragments: any, args: ValidationArguments) {
    if (!Array.isArray(fragments)) return true; // Cho phép mảng rỗng
    const keys = new Set();
    
    for (const frag of fragments) {
      if (!frag) return false;
      // 1. Phải có 'key' duy nhất (để messages và fragments khác tham chiếu)
      if (!isString(frag.key) || isEmpty(frag.key)) return false;
      if (keys.has(frag.key)) return false;
      keys.add(frag.key);

      // 2. Phải có 'type' hợp lệ
      if (
        !isString(frag.type) ||
        !/^(loop|alt|opt|par|region)$/.test(frag.type)
      ) {
        return false;
      }
      // 3. 'guard_condition' là string (có thể rỗng)
      if (typeof frag.guard_condition !== 'string') return false;
    }

    // 4. Validate parent_key (sau khi đã có tất cả keys)
    for (const frag of fragments) {
      if (frag.parent_key) {
        if (!isString(frag.parent_key) || !keys.has(frag.parent_key)) {
           return false; // parent_key phải tồn tại trong danh sách keys
        }
      }
    }
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return "Each fragment must have a unique 'key' string, a valid 'type' (loop, alt, ...), and any 'parent_key' must match an existing fragment 'key'";
  }
}

@ValidatorConstraint({ name: "AreMessagesValid", async: false })
class AreMessagesValidConstraint implements ValidatorConstraintInterface {
  validate(messages: any, args: ValidationArguments) {
    if (!Array.isArray(messages)) return true; // Cho phép mảng rỗng

    const dto = args.object as CreateSequenceDiagramBody;
    // Cần lifelines và fragments để kiểm tra chéo
    if (!dto.lifelines) return false;

    const lifelineNames = new Set(dto.lifelines.map((l: any) => l.name));
    const fragmentKeys = new Set((dto.fragments || []).map((f: any) => f.key));

    for (const msg of messages) {
      if (!msg) return false;
      
      // 1. Validate Lifeline references
      if (!isString(msg.source_lifeline_name) || !lifelineNames.has(msg.source_lifeline_name)) {
        return false; // source_lifeline_name phải tồn tại
      }
      if (!isString(msg.target_lifeline_name) || !lifelineNames.has(msg.target_lifeline_name)) {
        return false; // target_lifeline_name phải tồn tại
      }
      
      // 2. Validate Message properties
      if (typeof msg.order !== 'number' || msg.order < 0) return false; // 'order' phải là số
      if (!isString(msg.content)) return false; // 'content' là bắt buộc
      if (
        !isString(msg.type) ||
        !/^(sync|async|reply|create|destroy)$/.test(msg.type)
      ) {
        return false; // 'type' phải hợp lệ
      }

      // 3. Validate Fragment reference (nếu có)
      if (msg.fragment_key) {
        if (!isString(msg.fragment_key) || !fragmentKeys.has(msg.fragment_key)) {
          return false; // 'fragment_key' phải tồn tại (nếu được cung cấp)
        }
      }
    }
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return "Each message must have 'source_lifeline_name'/'target_lifeline_name' matching a lifeline 'name', a valid 'type', a numeric 'order', 'content', and any 'fragment_key' must match an existing fragment 'key'";
  }
}


/**
 * DTO chính để TẠO MỚI một Sequence Diagram
 */
export class CreateSequenceDiagramBody extends RequestDto {
  @IsNotEmpty({ message: "uml_id is required" })
  @IsMongoId({ message: "uml_id must be a valid ObjectId" })
  uml_id: string;

  @IsNotEmpty({ message: "Name is required" })
  @IsString()
  @Length(3, 255)
  name: string;

  // Cần biết Sequence này minh họa cho Usecase nào
  @IsNotEmpty({ message: "usecase_ref_id is required" })
  @IsString({ message: "usecase_ref_id must be a string" })
  usecase_ref_id: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsArray()
  @IsNotEmpty()
  @Validate(AreLifelinesValidConstraint)
  lifelines: any[]; // [{ name: string, description?: string }]

  @IsArray()
  @IsOptional()
  @Validate(AreFragmentsValidConstraint)
  fragments: any[]; // [{ key: string, type: string, guard_condition: string, parent_key?: string }]

  @IsArray()
  @IsOptional()
  @Validate(AreMessagesValidConstraint)
  messages: any[]; // [{ source_lifeline_name: string, target_lifeline_name: string, order: number, content: string, type: string, fragment_key?: string }]

  // Lưu trữ JSON cấu trúc (nodes, edges) cho "Cách 3"
  @IsOptional()
  @IsObject({ message: "layout_data must be an object" })
  layout_data: object; // { nodes: [], edges: [] }

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  related_requirements: string[];

  constructor(body: any) {
    super();
    if (body) {
      this.uml_id = body.uml_id;
      this.name = body.name;
      this.usecase_ref_id = body.usecase_ref_id;
      this.description = body.description;
      this.lifelines = body.lifelines;
      this.fragments = body.fragments;
      this.messages = body.messages;
      this.layout_data = body.layout_data;
      this.related_requirements = body.related_requirements;
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