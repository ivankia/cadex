import type { RouteShorthandOptions } from 'fastify'
import { error } from 'node:console'

export const opts: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['user_id', 'seat_id'],
      properties: {
        user_id: { type: 'string' },
        seat_id: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
      500: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          error: { type: 'string' },
        },
      },
    },
  },
}