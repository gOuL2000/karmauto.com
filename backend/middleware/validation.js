/**
 * Validation Middleware
 * Uses Zod for schema validation
 */

import { z } from 'zod';

/**
 * Validate request body against a Zod schema
 */
export function validateBody(schema) {
  return async (req, context) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      
      // Attach validated data to request
      req.validatedBody = validated;
      
      // Continue to handler
      return null; // null means continue
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request body',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema) {
  return async (req, context) => {
    try {
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams);
      const validated = schema.parse(queryParams);
      
      req.validatedQuery = validated;
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid query parameters',
            details: error.errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid query parameters',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Combine multiple middleware
 */
export function combineMiddleware(...middlewares) {
  return async (req, context) => {
    for (const middleware of middlewares) {
      const result = await middleware(req, context);
      if (result) {
        return result; // Stop if middleware returns a response
      }
    }
    return null; // All middleware passed
  };
}




