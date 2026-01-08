import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * Update transaction DTO
 * Inherits all validation and sanitization from CreateTransactionDto
 * Category names and descriptions are automatically sanitized via Transform decorators
 */
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
