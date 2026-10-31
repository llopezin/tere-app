import { createRouter } from '../../lib/create-app.js';
import { env } from '../../config/env.js';
import { authMiddleware, requireOrigin, requireRole } from '../../middleware/auth.js';
import me from './me/me.index.js';
import patients from './patients/patients.index.js';
import appointmentTypes from './appointment-types/appointment-types.index.js';
import workingSchedules from './working-schedules/working-schedules.index.js';
import blockedTimes from './blocked-times/blocked-times.index.js';
import availability from './availability/availability.index.js';
import appointments from './appointments/appointments.index.js';
import bonos from './bonos/bonos.index.js';
import payments from './payments/payments.index.js';
import reports from './reports/reports.index.js';
import invoices from './invoices/invoices.index.js';
import consentDocuments from './consent-documents/consent-documents.index.js';
import integrations from './integrations/integrations.index.js';

/**
 * Professional BFF, mounted at /api/v1/professional and consumed only by professional-app.
 * Every route requires a professional session, and browser requests must come from professional-app.
 * Handlers scope every query to the authenticated professional and validate every foreign id
 * (patients, appointment types, bonos, payments...) with services/ownership.service.
 */
const router = createRouter();
router.use('*', requireOrigin(env.PROFESSIONAL_APP_URL), authMiddleware, requireRole('professional'));

const professionalApi = router
  .route('/', me)
  .route('/', patients)
  .route('/', appointmentTypes)
  .route('/', workingSchedules)
  .route('/', blockedTimes)
  .route('/', availability)
  .route('/', appointments)
  .route('/', bonos)
  .route('/', payments)
  .route('/', reports)
  .route('/', invoices)
  .route('/', consentDocuments)
  .route('/', integrations);

export type ProfessionalAppType = typeof professionalApi;
export default professionalApi;
