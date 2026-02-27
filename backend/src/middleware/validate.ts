/**
 * Zod validation middleware factory.
 * Validates request query, body, or params against a Zod schema.
 */
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: AnyZodObject, target: ValidationTarget = 'body') {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            const parsed = schema.parse(req[target]);
            req[target] = parsed;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(error);
            } else {
                next(error);
            }
        }
    };
}
