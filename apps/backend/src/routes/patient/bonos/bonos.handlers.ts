import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '../../../lib/types.js';
import type { GetOneRoute } from './bonos.routes.js';
import { getProfileId } from '../../../middleware/auth.js';
import { assertBonoOf } from '../../../services/ownership.service.js';

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const patientId = getProfileId(c);
  const { id } = c.req.valid('param');
  const bono = await assertBonoOf({ patientId }, id);
  return c.json({ ...bono, sessions_remaining: bono.totalSessions - bono.sessionsUsed }, HttpStatusCodes.OK);
};
