import { SwaggerOptions } from 'swagger-ui-express';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

const registry = new OpenAPIRegistry();

// Basic OpenAPI configuration
registry.registerPath({
  method: 'get',
  path: '/',
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    }
  }
});

export const specs = registry.definitions; 