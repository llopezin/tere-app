/**
 * OpenAPI 3.1 specification for the Fisio App API.
 * Served at /api/v1/openapi.json and rendered by Scalar at /api/v1/docs.
 */

const paginationParams = [
  { name: 'page', in: 'query' as const, schema: { type: 'integer', default: 1, minimum: 1 }, description: 'Page number' },
  { name: 'per_page', in: 'query' as const, schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }, description: 'Results per page' },
];

const dateRangeParams = [
  { name: 'from', in: 'query' as const, schema: { type: 'string', format: 'date-time' }, description: 'Start date filter (ISO 8601)' },
  { name: 'to', in: 'query' as const, schema: { type: 'string', format: 'date-time' }, description: 'End date filter (ISO 8601)' },
];

const idParam = (name: string, description: string) => ({
  name,
  in: 'path' as const,
  required: true,
  schema: { type: 'string', format: 'uuid' },
  description,
});

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
});

const bearerAuth = [{ BearerAuth: [] }];

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Fisio App API',
    version: '1.0.0',
    description: 'Backend API for the Fisio App — a physiotherapy practice management platform. Manage professionals, patients, appointments, bonos, payments, invoices, and more.',
    contact: { name: 'Fisio App Team' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
  ],
  tags: [
    { name: 'Health', description: 'Health check endpoint' },
    { name: 'Auth', description: 'Authentication (Better Auth)' },
    { name: 'Professionals', description: 'Professional profile management' },
    { name: 'Patients', description: 'Patient CRUD and sub-resources' },
    { name: 'Patient Profile', description: 'Patient self-service profile' },
    { name: 'Appointment Types', description: 'Service types with duration and price' },
    { name: 'Working Schedules', description: 'Professional weekly schedules' },
    { name: 'Blocked Times', description: 'Time-off / blocked slots' },
    { name: 'Availability', description: 'Available booking slots' },
    { name: 'Appointments', description: 'Appointment lifecycle' },
    { name: 'Bonos', description: 'Session packs (bonos)' },
    { name: 'Payments', description: 'Payment tracking' },
    { name: 'Reports', description: 'Revenue analytics' },
    { name: 'Invoices', description: 'Invoice generation' },
    { name: 'Google Calendar', description: 'Google Calendar integration (stub)' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      AuthUser: {
        type: 'object',
        description: 'Authenticated user returned by Better Auth',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          emailVerified: { type: 'boolean' },
          image: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['professional', 'patient'] },
          profileId: { type: 'string', format: 'uuid', nullable: true, description: 'UUID linking to the professionals or patients table' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthSession: {
        type: 'object',
        description: 'Session object returned by Better Auth',
        properties: {
          id: { type: 'string' },
          token: { type: 'string' },
          userId: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          ipAddress: { type: 'string', nullable: true },
          userAgent: { type: 'string', nullable: true },
        },
      },
      Professional: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' },
          taxId: { type: 'string', nullable: true },
          addressStreet: { type: 'string', nullable: true },
          addressPostal: { type: 'string', nullable: true },
          addressCity: { type: 'string', nullable: true },
          addressProvince: { type: 'string', nullable: true },
          addressCountry: { type: 'string', nullable: true },
          googleCalendarId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid', nullable: true, description: 'Null for self-registered patients not yet linked to a professional' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          nie: { type: 'string', nullable: true },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          dateOfBirth: { type: 'string', nullable: true },
          addressStreet: { type: 'string', nullable: true },
          addressPostal: { type: 'string', nullable: true },
          addressCity: { type: 'string', nullable: true },
          addressProvince: { type: 'string', nullable: true },
          addressCountry: { type: 'string', nullable: true },
          contactMethod: { type: 'string', enum: ['email', 'sms', 'whatsapp'], nullable: true },
          clinicalNotes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatePatient: {
        type: 'object',
        required: ['firstName', 'lastName', 'phone'],
        properties: {
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 },
          nie: { type: 'string' },
          phone: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          dateOfBirth: { type: 'string' },
          addressStreet: { type: 'string' },
          addressPostal: { type: 'string' },
          addressCity: { type: 'string' },
          addressProvince: { type: 'string' },
          addressCountry: { type: 'string' },
          contactMethod: { type: 'string', enum: ['email', 'sms', 'whatsapp'] },
          clinicalNotes: { type: 'string' },
        },
      },
      AppointmentType: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          durationMinutes: { type: 'integer' },
          price: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateAppointmentType: {
        type: 'object',
        required: ['name', 'durationMinutes', 'price'],
        properties: {
          name: { type: 'string', minLength: 1 },
          durationMinutes: { type: 'integer', minimum: 1 },
          price: { type: 'number', minimum: 0 },
        },
      },
      WorkingScheduleSlot: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid' },
          dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, description: '0=Monday, 6=Sunday' },
          startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '09:00' },
          endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '14:00' },
        },
      },
      BlockedTime: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid' },
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          appointmentTypeId: { type: 'string', format: 'uuid' },
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['scheduled', 'completed', 'cancelled', 'no_show'] },
          price: { type: 'string' },
          notes: { type: 'string', nullable: true },
          bonoId: { type: 'string', format: 'uuid', nullable: true },
          useBonoSession: { type: 'boolean' },
          recurrenceGroupId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateAppointment: {
        type: 'object',
        required: ['patientId', 'appointmentTypeId', 'startAt'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          appointmentTypeId: { type: 'string', format: 'uuid' },
          startAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
          bonoId: { type: 'string', format: 'uuid', nullable: true },
          useBonoSession: { type: 'boolean', default: true },
        },
      },
      BatchAppointment: {
        type: 'object',
        required: ['patientId', 'appointmentTypeId', 'slots'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          appointmentTypeId: { type: 'string', format: 'uuid' },
          slots: { type: 'array', items: { type: 'object', properties: { startAt: { type: 'string', format: 'date-time' } }, required: ['startAt'] }, minItems: 1 },
          bonoId: { type: 'string', format: 'uuid', nullable: true },
          useBonoSession: { type: 'boolean', default: true },
        },
      },
      RecurringAppointment: {
        type: 'object',
        required: ['patientId', 'appointmentTypeId', 'startAt', 'recurrenceRule'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          appointmentTypeId: { type: 'string', format: 'uuid' },
          startAt: { type: 'string', format: 'date-time' },
          recurrenceRule: {
            type: 'object',
            required: ['frequency', 'count'],
            properties: {
              frequency: { type: 'string', enum: ['weekly'] },
              interval: { type: 'integer', minimum: 1, default: 1 },
              count: { type: 'integer', minimum: 1 },
            },
          },
          bonoId: { type: 'string', format: 'uuid', nullable: true },
          useBonoSession: { type: 'boolean', default: true },
        },
      },
      Bono: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          appointmentTypeId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          price: { type: 'string' },
          totalSessions: { type: 'integer' },
          sessionsUsed: { type: 'integer' },
          status: { type: 'string', enum: ['active', 'exhausted'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateBono: {
        type: 'object',
        required: ['patientId', 'appointmentTypeId', 'name', 'price', 'totalSessions'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          appointmentTypeId: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1 },
          price: { type: 'number', minimum: 0 },
          totalSessions: { type: 'integer', minimum: 1 },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          professionalId: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          appointmentId: { type: 'string', format: 'uuid', nullable: true },
          bonoId: { type: 'string', format: 'uuid', nullable: true },
          amount: { type: 'string' },
          paymentMethod: { type: 'string', enum: ['card', 'bizum', 'cash'] },
          paidAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatePayment: {
        type: 'object',
        required: ['patientId', 'amount', 'paymentMethod'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          appointmentId: { type: 'string', format: 'uuid', nullable: true },
          bonoId: { type: 'string', format: 'uuid', nullable: true },
          amount: { type: 'number', minimum: 0.01 },
          paymentMethod: { type: 'string', enum: ['card', 'bizum', 'cash'] },
          paidAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          invoiceNumber: { type: 'string', example: '2026-0001' },
          professionalId: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          appointmentId: { type: 'string', format: 'uuid' },
          paymentId: { type: 'string', format: 'uuid', nullable: true },
          amount: { type: 'string' },
          description: { type: 'string' },
          profName: { type: 'string' },
          profTaxId: { type: 'string', nullable: true },
          profAddress: { type: 'string' },
          patientName: { type: 'string' },
          patientTaxId: { type: 'string', nullable: true },
          patientAddress: { type: 'string' },
          pdfUrl: { type: 'string', nullable: true },
          issuedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      BillingData: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          billingName: { type: 'string' },
          addressStreet: { type: 'string', nullable: true },
          addressPostal: { type: 'string', nullable: true },
          addressCity: { type: 'string', nullable: true },
          addressProvince: { type: 'string', nullable: true },
          addressCountry: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RgpdConsent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          signed: { type: 'boolean' },
          signatureData: { type: 'string', nullable: true },
          signedAt: { type: 'string', format: 'date-time', nullable: true },
          ipAddress: { type: 'string', nullable: true },
        },
      },
    },
  },
  security: bearerAuth,
  paths: {
    // ── Health ──
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } } } } },
        },
      },
    },

    // ── Auth ──
    '/api/auth/sign-up/email': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        description: 'Creates a user, session, and auto-creates the corresponding profile (professional or patient) based on the role.',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'password', 'role'], properties: { name: { type: 'string', description: 'Full name (e.g. "Laura García")' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, role: { type: 'string', enum: ['professional', 'patient'], description: 'User role — determines which profile is auto-created' } } } } } },
        responses: {
          '200': { description: 'Account created. Session cookie set.', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/AuthUser' }, session: { $ref: '#/components/schemas/AuthSession' } } } } } },
          '422': errorResponse('Validation error (e.g. email already in use)'),
        },
      },
    },
    '/api/auth/sign-in/email': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } } },
        responses: {
          '200': { description: 'Login successful. Session cookie set.', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/AuthUser' }, session: { $ref: '#/components/schemas/AuthSession' } } } } } },
          '401': errorResponse('Invalid credentials'),
        },
      },
    },
    '/api/auth/sign-out': {
      post: {
        tags: ['Auth'],
        summary: 'Log out (clear session)',
        responses: {
          '200': { description: 'Session cleared' },
        },
      },
    },
    '/api/auth/get-session': {
      get: {
        tags: ['Auth'],
        summary: 'Get current session and user',
        description: 'Returns the authenticated user and session info. Returns null if no valid session cookie is present.',
        responses: {
          '200': { description: 'Current session', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/AuthUser' }, session: { $ref: '#/components/schemas/AuthSession' } } } } } },
        },
      },
    },
    '/api/auth/forget-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'redirectTo'], properties: { email: { type: 'string', format: 'email' }, redirectTo: { type: 'string', description: 'Frontend URL where the user will be sent with the reset token' } } } } } },
        responses: {
          '200': { description: 'Reset email sent (if email exists)' },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['newPassword', 'token'], properties: { newPassword: { type: 'string', minLength: 8 }, token: { type: 'string', description: 'Token from the reset email' } } } } } },
        responses: {
          '200': { description: 'Password reset successful' },
          '400': errorResponse('Invalid or expired token'),
        },
      },
    },

    // ── Professionals ──
    '/api/v1/professionals/me': {
      get: {
        tags: ['Professionals'],
        summary: 'Get current professional profile',
        responses: {
          '200': { description: 'Professional profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Professional' } } } },
          '404': errorResponse('Professional profile not found'),
        },
      },
      put: {
        tags: ['Professionals'],
        summary: 'Update current professional profile',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Professional' } } } },
        responses: {
          '200': { description: 'Updated profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Professional' } } } },
        },
      },
    },

    // ── Patients ──
    '/api/v1/patients': {
      get: {
        tags: ['Patients'],
        summary: 'List patients (with optional search)',
        parameters: [
          ...paginationParams,
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or NIE' },
        ],
        responses: {
          '200': { description: 'Paginated patient list', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Patient' } }, page: { type: 'integer' }, per_page: { type: 'integer' } } } } } },
        },
      },
      post: {
        tags: ['Patients'],
        summary: 'Create a new patient',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePatient' } } } },
        responses: {
          '201': { description: 'Created patient', content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } } },
        },
      },
    },
    '/api/v1/patients/{id}': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient by ID',
        parameters: [idParam('id', 'Patient UUID')],
        responses: {
          '200': { description: 'Patient details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } } },
          '404': errorResponse('Patient not found'),
        },
      },
      put: {
        tags: ['Patients'],
        summary: 'Update patient',
        parameters: [idParam('id', 'Patient UUID')],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePatient' } } } },
        responses: {
          '200': { description: 'Updated patient', content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } } },
        },
      },
    },
    '/api/v1/patients/{id}/appointments': {
      get: {
        tags: ['Patients'],
        summary: 'List patient appointments',
        parameters: [idParam('id', 'Patient UUID'), ...paginationParams, ...dateRangeParams, { name: 'status', in: 'query', schema: { type: 'string', enum: ['scheduled', 'completed', 'cancelled', 'no_show'] } }],
        responses: {
          '200': { description: 'Patient appointments', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } }, page: { type: 'integer' }, per_page: { type: 'integer' } } } } } },
        },
      },
    },
    '/api/v1/patients/{id}/bonos': {
      get: {
        tags: ['Patients'],
        summary: 'List patient bonos',
        parameters: [idParam('id', 'Patient UUID'), { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'exhausted'] } }],
        responses: {
          '200': { description: 'Patient bonos', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Bono' } } } } } } },
        },
      },
    },
    '/api/v1/patients/{id}/payments': {
      get: {
        tags: ['Patients'],
        summary: 'List patient payments',
        parameters: [idParam('id', 'Patient UUID')],
        responses: {
          '200': { description: 'Patient payments', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } } } } },
        },
      },
    },
    '/api/v1/patients/{id}/billing-data': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient billing data',
        parameters: [idParam('id', 'Patient UUID')],
        responses: {
          '200': { description: 'Billing data or null', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingData' } } } },
        },
      },
      put: {
        tags: ['Patients'],
        summary: 'Upsert patient billing data',
        parameters: [idParam('id', 'Patient UUID')],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['billingName'], properties: { billingName: { type: 'string' }, addressStreet: { type: 'string' }, addressPostal: { type: 'string' }, addressCity: { type: 'string' }, addressProvince: { type: 'string' }, addressCountry: { type: 'string' } } } } } },
        responses: {
          '200': { description: 'Updated billing data', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingData' } } } },
          '201': { description: 'Created billing data', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingData' } } } },
        },
      },
    },
    '/api/v1/patients/{id}/rgpd-consent': {
      get: {
        tags: ['Patients'],
        summary: 'Get RGPD consent status',
        parameters: [idParam('id', 'Patient UUID')],
        responses: {
          '200': { description: 'Consent status', content: { 'application/json': { schema: { $ref: '#/components/schemas/RgpdConsent' } } } },
        },
      },
      post: {
        tags: ['Patients'],
        summary: 'Submit RGPD consent with signature',
        parameters: [idParam('id', 'Patient UUID')],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['signatureData', 'signed'], properties: { signatureData: { type: 'string', minLength: 1 }, signed: { type: 'boolean', const: true } } } } } },
        responses: {
          '200': { description: 'Updated consent', content: { 'application/json': { schema: { $ref: '#/components/schemas/RgpdConsent' } } } },
          '201': { description: 'Created consent', content: { 'application/json': { schema: { $ref: '#/components/schemas/RgpdConsent' } } } },
        },
      },
    },
    '/api/v1/patients/{id}/contact-link': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient contact link (WhatsApp, SMS, or email)',
        parameters: [idParam('id', 'Patient UUID')],
        responses: {
          '200': { description: 'Contact link', content: { 'application/json': { schema: { type: 'object', properties: { method: { type: 'string' }, link: { type: 'string' } } } } } },
        },
      },
    },

    // ── Patient Profile (self-service) ──
    '/api/v1/patient/me': {
      get: {
        tags: ['Patient Profile'],
        summary: 'Get own patient profile',
        responses: {
          '200': { description: 'Patient profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } } },
        },
      },
      put: {
        tags: ['Patient Profile'],
        summary: 'Update own patient profile',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePatient' } } } },
        responses: {
          '200': { description: 'Updated profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } } },
        },
      },
    },
    '/api/v1/patient/me/appointments': {
      get: {
        tags: ['Patient Profile'],
        summary: 'List own appointments',
        parameters: [...paginationParams],
        responses: {
          '200': { description: 'Appointments', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } }, page: { type: 'integer' }, per_page: { type: 'integer' } } } } } },
        },
      },
    },
    '/api/v1/patient/me/billing-data': {
      get: {
        tags: ['Patient Profile'],
        summary: 'Get own billing data',
        responses: {
          '200': { description: 'Billing data or null', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingData' } } } },
        },
      },
      put: {
        tags: ['Patient Profile'],
        summary: 'Upsert own billing data',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['billingName'], properties: { billingName: { type: 'string' }, addressStreet: { type: 'string' }, addressPostal: { type: 'string' }, addressCity: { type: 'string' }, addressProvince: { type: 'string' }, addressCountry: { type: 'string' } } } } } },
        responses: {
          '200': { description: 'Updated billing data', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingData' } } } },
          '201': { description: 'Created billing data', content: { 'application/json': { schema: { $ref: '#/components/schemas/BillingData' } } } },
        },
      },
    },

    // ── Appointment Types ──
    '/api/v1/appointment-types': {
      get: {
        tags: ['Appointment Types'],
        summary: 'List appointment types',
        description: 'Professionals see their own types. Patients must pass ?professional_id= to see active types for booking.',
        parameters: [{ name: 'professional_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Required for patient role' }],
        responses: {
          '200': { description: 'Appointment types', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/AppointmentType' } } } } } } },
        },
      },
      post: {
        tags: ['Appointment Types'],
        summary: 'Create appointment type',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAppointmentType' } } } },
        responses: {
          '201': { description: 'Created type', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentType' } } } },
        },
      },
    },
    '/api/v1/appointment-types/{id}': {
      put: {
        tags: ['Appointment Types'],
        summary: 'Update appointment type',
        parameters: [idParam('id', 'Appointment type UUID')],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAppointmentType' } } } },
        responses: {
          '200': { description: 'Updated type', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentType' } } } },
        },
      },
      delete: {
        tags: ['Appointment Types'],
        summary: 'Deactivate appointment type (soft delete)',
        parameters: [idParam('id', 'Appointment type UUID')],
        responses: {
          '200': { description: 'Deactivated', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },

    // ── Working Schedules ──
    '/api/v1/working-schedules': {
      get: {
        tags: ['Working Schedules'],
        summary: 'Get weekly schedule',
        responses: {
          '200': { description: 'Schedule slots', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/WorkingScheduleSlot' } } } } } } },
        },
      },
      put: {
        tags: ['Working Schedules'],
        summary: 'Bulk replace weekly schedule',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['slots'], properties: { slots: { type: 'array', items: { type: 'object', required: ['dayOfWeek', 'startTime', 'endTime'], properties: { dayOfWeek: { type: 'integer', minimum: 0, maximum: 6 }, startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }, endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' } } } } } } } } },
        responses: {
          '200': { description: 'Updated schedule', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/WorkingScheduleSlot' } } } } } } },
        },
      },
    },

    // ── Blocked Times ──
    '/api/v1/blocked-times': {
      get: {
        tags: ['Blocked Times'],
        summary: 'List blocked time slots',
        parameters: [...dateRangeParams],
        responses: {
          '200': { description: 'Blocked times', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/BlockedTime' } } } } } } },
        },
      },
      post: {
        tags: ['Blocked Times'],
        summary: 'Create blocked time',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['startAt', 'endAt'], properties: { startAt: { type: 'string', format: 'date-time' }, endAt: { type: 'string', format: 'date-time' } } } } } },
        responses: {
          '201': { description: 'Created blocked time', content: { 'application/json': { schema: { $ref: '#/components/schemas/BlockedTime' } } } },
        },
      },
    },
    '/api/v1/blocked-times/{id}': {
      delete: {
        tags: ['Blocked Times'],
        summary: 'Remove blocked time',
        parameters: [idParam('id', 'Blocked time UUID')],
        responses: {
          '200': { description: 'Removed', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '404': errorResponse('Blocked time not found'),
        },
      },
    },

    // ── Availability ──
    '/api/v1/availability': {
      get: {
        tags: ['Availability'],
        summary: 'Get available booking slots',
        description: 'Returns available time slots based on the professional\'s schedule, existing appointments, and blocked times.',
        parameters: [
          { name: 'professional_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'appointment_type_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'from', in: 'query', required: true, schema: { type: 'string' }, description: 'Start date (ISO 8601)' },
          { name: 'to', in: 'query', required: true, schema: { type: 'string' }, description: 'End date (ISO 8601)' },
        ],
        responses: {
          '200': { description: 'Available slots', content: { 'application/json': { schema: { type: 'object', properties: { slots: { type: 'array', items: { type: 'object', properties: { start_at: { type: 'string', format: 'date-time' }, end_at: { type: 'string', format: 'date-time' } } } } } } } } },
        },
      },
    },

    // ── Appointments ──
    '/api/v1/appointments': {
      get: {
        tags: ['Appointments'],
        summary: 'List appointments',
        parameters: [...paginationParams, ...dateRangeParams, { name: 'status', in: 'query', schema: { type: 'string', enum: ['scheduled', 'completed', 'cancelled', 'no_show'] } }, { name: 'patient_id', in: 'query', schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Appointments', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } }, page: { type: 'integer' }, per_page: { type: 'integer' } } } } } },
        },
      },
      post: {
        tags: ['Appointments'],
        summary: 'Create single appointment',
        description: 'Requires RGPD consent signed. Checks for time conflicts.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAppointment' } } } },
        responses: {
          '201': { description: 'Created appointment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
          '403': errorResponse('RGPD consent required'),
          '409': errorResponse('Time slot conflict'),
        },
      },
    },
    '/api/v1/appointments/batch': {
      post: {
        tags: ['Appointments'],
        summary: 'Create multiple appointments at once',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchAppointment' } } } },
        responses: {
          '201': { description: 'Created appointments', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } } } } } } },
        },
      },
    },
    '/api/v1/appointments/recurring': {
      post: {
        tags: ['Appointments'],
        summary: 'Create recurring weekly appointments',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecurringAppointment' } } } },
        responses: {
          '201': { description: 'Created appointments', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } }, recurrence_group_id: { type: 'string', format: 'uuid' } } } } } },
        },
      },
    },
    '/api/v1/appointments/{id}': {
      get: {
        tags: ['Appointments'],
        summary: 'Get appointment by ID',
        parameters: [idParam('id', 'Appointment UUID')],
        responses: {
          '200': { description: 'Appointment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
          '404': errorResponse('Appointment not found'),
        },
      },
      put: {
        tags: ['Appointments'],
        summary: 'Update appointment',
        parameters: [idParam('id', 'Appointment UUID')],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { appointmentTypeId: { type: 'string', format: 'uuid' }, startAt: { type: 'string', format: 'date-time' }, notes: { type: 'string' }, price: { type: 'number', minimum: 0 } } } } } },
        responses: {
          '200': { description: 'Updated appointment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
        },
      },
    },
    '/api/v1/appointments/{id}/cancel': {
      patch: {
        tags: ['Appointments'],
        summary: 'Cancel appointment',
        description: 'Cancels the appointment and refunds bono session if applicable. Cannot cancel past appointments.',
        parameters: [idParam('id', 'Appointment UUID')],
        responses: {
          '200': { description: 'Cancelled appointment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
          '400': errorResponse('Cannot cancel past appointments'),
        },
      },
    },
    '/api/v1/appointments/{id}/complete': {
      patch: {
        tags: ['Appointments'],
        summary: 'Mark appointment as completed',
        parameters: [idParam('id', 'Appointment UUID')],
        responses: {
          '200': { description: 'Completed appointment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
        },
      },
    },
    '/api/v1/appointments/{id}/no-show': {
      patch: {
        tags: ['Appointments'],
        summary: 'Mark appointment as no-show',
        parameters: [idParam('id', 'Appointment UUID')],
        responses: {
          '200': { description: 'No-show appointment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } },
        },
      },
    },

    // ── Bonos ──
    '/api/v1/bonos': {
      get: {
        tags: ['Bonos'],
        summary: 'List bonos',
        parameters: [{ name: 'patient_id', in: 'query', schema: { type: 'string', format: 'uuid' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'exhausted'] } }],
        responses: {
          '200': { description: 'Bonos', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Bono' } } } } } } },
        },
      },
      post: {
        tags: ['Bonos'],
        summary: 'Create bono (session pack)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBono' } } } },
        responses: {
          '201': { description: 'Created bono', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bono' } } } },
        },
      },
    },
    '/api/v1/bonos/{id}': {
      get: {
        tags: ['Bonos'],
        summary: 'Get bono with remaining sessions',
        parameters: [idParam('id', 'Bono UUID')],
        responses: {
          '200': { description: 'Bono with sessions_remaining', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Bono' }, { type: 'object', properties: { sessions_remaining: { type: 'integer' } } }] } } } },
        },
      },
    },
    '/api/v1/bonos/{id}/transactions': {
      get: {
        tags: ['Bonos'],
        summary: 'List bono transactions (deductions/refunds)',
        parameters: [idParam('id', 'Bono UUID')],
        responses: {
          '200': { description: 'Transactions', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, bonoId: { type: 'string', format: 'uuid' }, appointmentId: { type: 'string', format: 'uuid', nullable: true }, type: { type: 'string', enum: ['deduction', 'refund', 'manual_deduction'] }, createdAt: { type: 'string', format: 'date-time' } } } } } } } } },
        },
      },
    },
    '/api/v1/bonos/{id}/deduct': {
      post: {
        tags: ['Bonos'],
        summary: 'Manually deduct a bono session',
        parameters: [idParam('id', 'Bono UUID')],
        responses: {
          '200': { description: 'Updated bono', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bono' } } } },
          '400': errorResponse('Bono exhausted or no remaining sessions'),
        },
      },
    },

    // ── Payments ──
    '/api/v1/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List payments',
        parameters: [...paginationParams, ...dateRangeParams, { name: 'patient_id', in: 'query', schema: { type: 'string', format: 'uuid' } }, { name: 'payment_method', in: 'query', schema: { type: 'string', enum: ['card', 'bizum', 'cash'] } }],
        responses: {
          '200': { description: 'Payments', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Payment' } }, page: { type: 'integer' }, per_page: { type: 'integer' } } } } } },
        },
      },
      post: {
        tags: ['Payments'],
        summary: 'Record a payment',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePayment' } } } },
        responses: {
          '201': { description: 'Created payment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } },
        },
      },
    },
    '/api/v1/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment by ID',
        parameters: [idParam('id', 'Payment UUID')],
        responses: {
          '200': { description: 'Payment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } },
          '404': errorResponse('Payment not found'),
        },
      },
    },

    // ── Reports ──
    '/api/v1/reports/revenue/monthly': {
      get: {
        tags: ['Reports'],
        summary: 'Monthly revenue report',
        parameters: [
          { name: 'year', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'month', in: 'query', required: true, schema: { type: 'integer', minimum: 1, maximum: 12 } },
        ],
        responses: {
          '200': { description: 'Monthly revenue', content: { 'application/json': { schema: { type: 'object', properties: { year: { type: 'integer' }, month: { type: 'integer' }, total: { type: 'number' }, payment_count: { type: 'integer' } } } } } },
        },
      },
    },
    '/api/v1/reports/revenue/quarterly': {
      get: {
        tags: ['Reports'],
        summary: 'Quarterly revenue report',
        parameters: [
          { name: 'year', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'quarter', in: 'query', required: true, schema: { type: 'integer', minimum: 1, maximum: 4 } },
        ],
        responses: {
          '200': { description: 'Quarterly revenue', content: { 'application/json': { schema: { type: 'object', properties: { year: { type: 'integer' }, quarter: { type: 'integer' }, total: { type: 'number' }, by_month: { type: 'array', items: { type: 'object', properties: { month: { type: 'integer' }, total: { type: 'number' } } } } } } } } },
        },
      },
    },
    '/api/v1/reports/revenue/by-method': {
      get: {
        tags: ['Reports'],
        summary: 'Revenue breakdown by payment method',
        parameters: [
          { name: 'year', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'month', in: 'query', required: true, schema: { type: 'integer', minimum: 1, maximum: 12 } },
        ],
        responses: {
          '200': { description: 'Revenue by method', content: { 'application/json': { schema: { type: 'object', properties: { year: { type: 'integer' }, month: { type: 'integer' }, total: { type: 'number' }, by_method: { type: 'array', items: { type: 'object', properties: { method: { type: 'string' }, total: { type: 'number' }, count: { type: 'integer' }, percentage: { type: 'number' } } } } } } } } },
        },
      },
    },

    // ── Invoices ──
    '/api/v1/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'List invoices',
        parameters: [...paginationParams, ...dateRangeParams, { name: 'patient_id', in: 'query', schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Invoices', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } }, page: { type: 'integer' }, per_page: { type: 'integer' } } } } } },
        },
      },
      post: {
        tags: ['Invoices'],
        summary: 'Generate invoice for an appointment',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['appointmentId'], properties: { appointmentId: { type: 'string', format: 'uuid' }, paymentId: { type: 'string', format: 'uuid', nullable: true } } } } } },
        responses: {
          '201': { description: 'Created invoice', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
        },
      },
    },
    '/api/v1/invoices/{id}': {
      get: {
        tags: ['Invoices'],
        summary: 'Get invoice by ID',
        parameters: [idParam('id', 'Invoice UUID')],
        responses: {
          '200': { description: 'Invoice', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
          '404': errorResponse('Invoice not found'),
        },
      },
    },
    '/api/v1/invoices/{id}/pdf': {
      get: {
        tags: ['Invoices'],
        summary: 'Get invoice PDF (or HTML fallback)',
        parameters: [idParam('id', 'Invoice UUID')],
        responses: {
          '200': { description: 'HTML invoice', content: { 'text/html': { schema: { type: 'string' } } } },
          '302': { description: 'Redirect to PDF URL' },
        },
      },
    },

    // ── Google Calendar ──
    '/api/v1/integrations/google-calendar/connect': {
      post: {
        tags: ['Google Calendar'],
        summary: 'Initiate Google Calendar OAuth (stub)',
        responses: {
          '200': { description: 'OAuth redirect info', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, redirect_url: { type: 'string' } } } } } },
        },
      },
    },
    '/api/v1/integrations/google-calendar/disconnect': {
      delete: {
        tags: ['Google Calendar'],
        summary: 'Disconnect Google Calendar',
        responses: {
          '200': { description: 'Disconnected', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/v1/integrations/google-calendar/sync': {
      post: {
        tags: ['Google Calendar'],
        summary: 'Sync appointments to Google Calendar (stub)',
        responses: {
          '200': { description: 'Sync result', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, synced_count: { type: 'integer' } } } } } },
          '400': errorResponse('Google Calendar not connected'),
        },
      },
    },
  },
};
