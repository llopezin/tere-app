import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

const tags = ['Patient Dashboard'];
const patientMiddleware = defineMiddleware(authMiddleware, requireRole('patient'));

const dashboardProfessionalSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  occupation: z.string().nullable(),
});

export const listProfessionals = createRoute({
  method: 'get',
  path: '/patient/professionals',
  middleware: patientMiddleware,
  tags,
  summary: 'List professionals available to book from the patient dashboard',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(dashboardProfessionalSchema) }),
      'Professionals with only the fields the dashboard needs',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export type ListProfessionalsRoute = typeof listProfessionals;
