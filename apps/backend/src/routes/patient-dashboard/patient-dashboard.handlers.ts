import type { AppRouteHandler } from '../../lib/types.js';
import type { ListProfessionalsRoute } from './patient-dashboard.routes.js';
import { db } from '../../db/index.js';
import { professionals } from '../../db/schema/professionals.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const listProfessionals: AppRouteHandler<ListProfessionalsRoute> = async (c) => {
  const rows = await db
    .select({
      id: professionals.id,
      firstName: professionals.firstName,
      lastName: professionals.lastName,
      occupation: professionals.occupation,
    })
    .from(professionals)
    .orderBy(professionals.firstName, professionals.lastName);

  const data = rows.map(({ id, firstName, lastName, occupation }) => ({
    id,
    name: `${firstName} ${lastName}`,
    occupation,
  }));

  return c.json({ data }, HttpStatusCodes.OK);
};
