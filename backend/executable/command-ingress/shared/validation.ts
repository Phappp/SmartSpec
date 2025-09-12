import { ValidationError } from 'class-validator';

export interface ValidationFormattedError {
  property: string;
  messages: string[];
}

export type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
};
