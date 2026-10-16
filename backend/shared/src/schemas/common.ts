import { z } from 'zod';

// Field rules from FRS section 9.1
export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Enter a name of at least 2 letters')
  .max(80)
  .regex(/^[\p{L} .']+$/u, 'Enter a name of at least 2 letters');
export const emailSchema = z.string().email('Enter a valid email');
export const caseNumberSchema = z
  .string()
  .max(30)
  .regex(/^[A-Za-z0-9/.\-]+$/, 'Use letters, numbers, / or -');
export const cnrSchema = z.string().regex(/^[A-Z0-9]{16}$/, 'CNR must be 16 characters');
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD, IST
export const amountSchema = z.number().min(1).max(999999999).multipleOf(0.01, 'Enter a valid amount');

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
