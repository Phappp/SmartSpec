// dtos/createUsecaseDiagram.dto.ts

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

// --- Custom Validators cho Schema MỚI ---

@ValidatorConstraint({ name: "AreActorsValid", async: false })
class AreActorsValidConstraint implements ValidatorConstraintInterface {
  validate(actors: any, args: ValidationArguments) {
    if (!Array.isArray(actors)) return false;
    const names = new Set();
    for (const actor of actors) {
      if (!actor || !isString(actor.name) || isEmpty(actor.name)) {
        return false;
      }
      if (names.has(actor.name)) return false; // Tên actor phải là duy nhất
      names.add(actor.name);
    }
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return "actors must be an array, each actor must have a unique, non-empty 'name' string";
  }
}

@ValidatorConstraint({ name: "AreUsecasesValid", async: false })
class AreUsecasesValidConstraint implements ValidatorConstraintInterface {
  validate(usecases: any, args: ValidationArguments) {
    if (!Array.isArray(usecases)) return false;
    const titles = new Set();
    for (const uc of usecases) {
      if (!uc || !isString(uc.title) || isEmpty(uc.title)) {
        return false;
      }
      if (titles.has(uc.title)) return false; // Title usecase phải là duy nhất
      titles.add(uc.title);
    }
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return "usecases must be an array, each usecase must have a unique, non-empty 'title' string";
  }
}

@ValidatorConstraint({ name: "AreAssociationsValid", async: false })
class AreAssociationsValidConstraint implements ValidatorConstraintInterface {
  validate(associations: any, args: ValidationArguments) {
    if (!Array.isArray(associations)) return true; // Cho phép mảng rỗng

    const dto = args.object as CreateUsecaseDiagramBody;
    if (!dto.actors || !dto.usecases) return false;

    const actorNames = new Set(dto.actors.map((a: any) => a.name));
    const usecaseTitles = new Set(dto.usecases.map((u: any) => u.title));

    for (const assoc of associations) {
      if (!assoc) return false;
      if (!isString(assoc.actor_name) || !actorNames.has(assoc.actor_name)) {
        return false; // actor_name phải tồn tại trong list actors
      }
      if (
        !isString(assoc.usecase_title) ||
        !usecaseTitles.has(assoc.usecase_title)
      ) {
        return false; // usecase_title phải tồn tại trong list usecases
      }
    }
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return "Each association must have 'actor_name' and 'usecase_title' that match an existing 'name'/'title' in the actors/usecases lists";
  }
}

@ValidatorConstraint({ name: "AreRelationshipsValid", async: false })
class AreRelationshipsValidConstraint implements ValidatorConstraintInterface {
  validate(relationships: any, args: ValidationArguments) {
    if (!Array.isArray(relationships)) return true; // Cho phép mảng rỗng

    const dto = args.object as CreateUsecaseDiagramBody;
    if (!dto.actors || !dto.usecases) return false;

    // Tổng hợp tất cả các ID hợp lệ (actor names và usecase titles)
    const validIds = new Set([
      ...dto.actors.map((a: any) => a.name),
      ...dto.usecases.map((u: any) => u.title),
    ]);

    for (const rel of relationships) {
      if (!rel) return false;
      // Validate source và target
      if (!isString(rel.source) || !validIds.has(rel.source)) {
        return false; // source phải là một actor name hoặc usecase title hợp lệ
      }
      if (!isString(rel.target) || !validIds.has(rel.target)) {
        return false; // target phải là một actor name hoặc usecase title hợp lệ
      }
      // Validate type
      if (
        !isString(rel.type) ||
        !/^(include|extend|generalization)$/.test(rel.type)
      ) {
        return false;
      }
    }
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return "Each relationship must have 'source' and 'target' that match an existing actor 'name' or usecase 'title', and a valid 'type' (include, extend, generalization)";
  }
}

/**
 * DTO chính để TẠO MỚI một Use Case Diagram
 */
export class CreateUsecaseDiagramBody extends RequestDto {
  @IsNotEmpty({ message: "uml_id is required" })
  @IsMongoId({ message: "uml_id must be a valid ObjectId" })
  uml_id: string;

  @IsNotEmpty({ message: "Name is required" })
  @IsString()
  @Length(3, 255)
  name: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsArray()
  @IsNotEmpty()
  @Validate(AreActorsValidConstraint)
  actors: any[]; // [{ name: string, description?: string }]

  @IsArray()
  @IsNotEmpty()
  @Validate(AreUsecasesValidConstraint)
  usecases: any[]; // [{ title: string, description?: string }]

  @IsArray()
  @IsOptional()
  @Validate(AreAssociationsValidConstraint)
  associations: any[]; // [{ actor_name: string, usecase_title: string }]

  @IsArray()
  @IsOptional()
  @Validate(AreRelationshipsValidConstraint)
  relationships: any[]; // [{ source: string, target: string, type: string }]

  @IsOptional()
  @IsString()
  diagram_svg: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  related_requirements: string[];

  constructor(body: any) {
    super();
    if (body) {
      this.uml_id = body.uml_id;
      this.name = body.name;
      this.description = body.description;
      this.actors = body.actors;
      this.usecases = body.usecases;
      this.associations = body.associations;
      this.relationships = body.relationships;
      this.diagram_svg = body.diagram_svg;
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
