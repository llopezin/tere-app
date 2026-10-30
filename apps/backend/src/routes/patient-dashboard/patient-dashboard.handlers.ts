import type { AppRouteHandler } from '../../lib/types.js';
import type { ListProfessionalsRoute } from './patient-dashboard.routes.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as patientDashboardService from '../../services/patient-dashboard.service.js';

export const listProfessionals: AppRouteHandler<ListProfessionalsRoute> = async (c) => {
  const data = await patientDashboardService.listBookableProfessionals();
  return c.json({ data }, HttpStatusCodes.OK);
};
