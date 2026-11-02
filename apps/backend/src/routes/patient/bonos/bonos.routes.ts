import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { selectBonoSchema } from '../../../db/schema/bonos.js';
import { idParamsSchema } from '../../../lib/schemas.js';

const tags = ['Patient / Bonos'];

const bonoWithRemainingSchema = selectBonoSchema.extend({
  sessions_remaining: z.number(),
});

export const getOne = createRoute({
  method: 'get',
  path: '/bonos/{id}',
  tags,
  summary: 'Get one of my bonos',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(bonoWithRemainingSchema, 'The bono'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Bono not found'), 'Bono not found'),
  },
});

export type GetOneRoute = typeof getOne;
