import { createRouter } from '../../lib/create-app.js';
import { env } from '../../config/env.js';
import { authMiddleware, requireOrigin, requireRole } from '../../middleware/auth.js';
import me from './me/me.index.js';
import booking from './booking/booking.index.js';
import appointments from './appointments/appointments.index.js';
import bonos from './bonos/bonos.index.js';
import invoices from './invoices/invoices.index.js';

/**
 * Patient BFF, mounted at /api/v1/patient and consumed only by client-app.
 * Every route requires a patient session, and browser requests must come from client-app.
 * Handlers scope every query to the authenticated patient (`getProfileId`).
 */
const router = createRouter();
router.use('*', requireOrigin(env.CLIENT_APP_URL), authMiddleware, requireRole('patient'));

const patientApi = router
  .route('/', me)
  .route('/', booking)
  .route('/', appointments)
  .route('/', bonos)
  .route('/', invoices);

export type PatientAppType = typeof patientApi;
export default patientApi;
