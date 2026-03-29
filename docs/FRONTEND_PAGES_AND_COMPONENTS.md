# Frontend Pages & Components

Derived from PRD.md, API_ENDPOINTS.md, and the existing backend routes.
The frontend is a **Vite + React** SPA with **Tailwind CSS** and **React Router**.

---

## Route Map

Two separate layouts based on role: **Professional** and **Patient**.

```
/login                          → LoginPage
/signup                         → SignUpPage
/forgot-password                → ForgotPasswordPage
/reset-password                 → ResetPasswordPage

── Professional Layout (/dashboard/*) ──

/dashboard                      → CalendarPage (weekly view)
/dashboard/appointments/:id     → AppointmentDetailPage
/dashboard/patients             → PatientListPage
/dashboard/patients/:id         → PatientDetailPage
/dashboard/accounting           → AccountingPage
/dashboard/settings             → ProfessionalSettingsPage
/dashboard/settings/schedule    → WorkingSchedulePage
/dashboard/settings/types       → AppointmentTypesPage
/dashboard/settings/bonos       → BonoTemplatesPage (create bonos from here)

── Patient Layout (/app/*) ──

/app                            → PatientHomePage (upcoming appointments)
/app/book                       → BookingPage (calendar + slot selection)
/app/appointments/:id           → PatientAppointmentDetailPage
/app/profile                    → PatientProfilePage
/app/rgpd                       → RgpdConsentPage
```

---

## Pages

### Auth Pages (public, no layout)

| Page | Route | Description |
|------|-------|-------------|
| **LoginPage** | `/login` | Email + password form. Redirects to `/dashboard` or `/app` based on role. |
| **SignUpPage** | `/signup` | Name, email, password, role selector. Supports optional `?professional_id=` for patient invite links. |
| **ForgotPasswordPage** | `/forgot-password` | Email input → triggers reset email. |
| **ResetPasswordPage** | `/reset-password` | New password form. Reads `?token=` from URL. |

### Professional Pages

| Page | Route | API Calls | Description |
|------|-------|-----------|-------------|
| **CalendarPage** | `/dashboard` | `GET /appointments`, `GET /blocked-times` | Weekly calendar view. Shows all appointments and blocked times. Navigate by week. Click to view/create. |
| **AppointmentDetailPage** | `/dashboard/appointments/:id` | `GET /appointments/:id`, `PATCH .../cancel`, `PATCH .../complete`, `PATCH .../no-show`, `GET /patients/:id/contact-link` | Full appointment info. Actions: mark complete, cancel, no-show, edit, contact patient. |
| **PatientListPage** | `/dashboard/patients` | `GET /patients?search=` | Searchable patient list. Click to open patient detail. Button to create new patient. |
| **PatientDetailPage** | `/dashboard/patients/:id` | `GET /patients/:id`, `GET .../appointments`, `GET .../bonos`, `GET .../payments`, `GET .../billing-data`, `GET .../rgpd-consent`, `GET .../contact-link` | Patient profile, appointment history, bonos, payments. Quick contact button. |
| **AccountingPage** | `/dashboard/accounting` | `GET /reports/revenue/monthly`, `GET /reports/revenue/quarterly`, `GET /reports/revenue/by-method`, `GET /payments`, `GET /invoices` | Monthly/quarterly revenue, payment method breakdown, payment list, invoice list. |
| **ProfessionalSettingsPage** | `/dashboard/settings` | `GET /professionals/me`, `PUT /professionals/me` | Edit business name, tax ID, address, phone. Google Calendar connect/disconnect. |
| **WorkingSchedulePage** | `/dashboard/settings/schedule` | `GET /working-schedules`, `PUT /working-schedules`, `GET /blocked-times`, `POST /blocked-times`, `DELETE /blocked-times/:id` | Visual weekly schedule editor. Blocked times management. |
| **AppointmentTypesPage** | `/dashboard/settings/types` | `GET /appointment-types`, `POST`, `PUT`, `DELETE` | CRUD for appointment types (name, duration, price). |
| **BonoTemplatesPage** | `/dashboard/settings/bonos` | `GET /bonos`, `POST /bonos` | Create bonos for patients. View existing bonos. |

### Patient Pages

| Page | Route | API Calls | Description |
|------|-------|-----------|-------------|
| **PatientHomePage** | `/app` | `GET /patient/me/appointments` | Dashboard with upcoming and past appointments. Download invoice button on past completed appointments. |
| **BookingPage** | `/app/book` | `GET /availability`, `GET /appointment-types`, `POST /appointments` | Step-by-step booking: select type → select date/slot → confirm. |
| **PatientAppointmentDetailPage** | `/app/appointments/:id` | `GET /appointments/:id`, `PATCH .../cancel`, `GET /invoices` | View appointment details. Cancel if in the future. Download invoice if completed. |
| **PatientProfilePage** | `/app/profile` | `GET /patient/me`, `PUT /patient/me`, `GET /patient/me/billing-data`, `PUT /patient/me/billing-data` | Edit personal data, contact method preference, and billing data for invoices. |
| **RgpdConsentPage** | `/app/rgpd` | `GET /patients/:id/rgpd-consent`, `POST /patients/:id/rgpd-consent` | RGPD consent form with digital signature pad. Required before booking. |

---

## Shared Components

### Layout

| Component | Description |
|-----------|-------------|
| **AppShell** | Top-level layout: sidebar (desktop) / bottom nav (mobile), header with user info. |
| **ProfessionalLayout** | AppShell variant with professional navigation items. |
| **PatientLayout** | AppShell variant with patient navigation items. |
| **ProtectedRoute** | Auth guard — redirects to `/login` if unauthenticated. |
| **RoleRoute** | Role guard — redirects if user doesn't match required role. |

### Navigation

| Component | Description |
|-----------|-------------|
| **Sidebar** | Desktop sidebar with nav links, user avatar, sign out. |
| **BottomNav** | Mobile bottom navigation bar. |
| **Header** | Top bar with page title, breadcrumbs, user menu. |

### Calendar & Scheduling

| Component | Description |
|-----------|-------------|
| **WeekCalendar** | Full weekly calendar grid (7 days × time slots). Shows appointments and blocked times as colored blocks. Navigate by week. |
| **DayColumn** | Single day column in the calendar. Renders time slots and appointment blocks. |
| **AppointmentBlock** | Clickable block on the calendar representing an appointment. Color-coded by status. |
| **BlockedTimeBlock** | Gray block on the calendar representing blocked time. |
| **TimeSlotPicker** | Grid of available time slots for booking. Supports multi-select (batch booking). |
| **DateNavigator** | Week/month navigation arrows with current date range label. |

### Appointments

| Component | Description |
|-----------|-------------|
| **CreateAppointmentModal** | Modal form: select patient, type, date/time, optional notes, bono selector. |
| **BatchAppointmentModal** | Modal: select patient + type, then pick multiple slots from the calendar. |
| **RecurringAppointmentModal** | Modal: select patient + type + start date + recurrence rule (weekly × N). |
| **AppointmentCard** | Summary card showing patient name, time, type, status badge. Used in lists. |
| **AppointmentStatusBadge** | Colored badge: scheduled (blue), completed (green), cancelled (red), no_show (orange). |
| **AppointmentActions** | Button group: Complete, Cancel, No-show, Edit, Contact patient. Contextual based on status. |

### Patients

| Component | Description |
|-----------|-------------|
| **PatientSearchInput** | Search input with debounced API call to `GET /patients?search=`. |
| **PatientCard** | Card with patient name, phone, email, contact method icon. |
| **PatientForm** | Form for creating/editing patient: name, NIE, phone, email, DOB, address, contact method, notes. |
| **ContactButton** | Opens WhatsApp/SMS/email link based on patient's preferred contact method. |

### Bonos

| Component | Description |
|-----------|-------------|
| **BonoCard** | Card showing bono name, sessions used/total, progress bar, status. |
| **CreateBonoModal** | Form: select patient, appointment type, name, price, total sessions. |
| **BonoSelector** | Dropdown in appointment creation to optionally link a bono. Shows remaining sessions. |
| **BonoTransactionList** | Table of deductions and refunds for a bono. |

### Payments & Accounting

| Component | Description |
|-----------|-------------|
| **RecordPaymentModal** | Form: patient, amount, method (card/bizum/cash), optional appointment/bono link, notes. |
| **PaymentList** | Filterable table of payments with date, patient, amount, method. |
| **RevenueCard** | Summary card showing total revenue for a period. |
| **RevenueChart** | Bar/line chart for monthly or quarterly revenue. |
| **PaymentMethodBreakdown** | Pie or bar chart showing revenue split by card/bizum/cash. |

### Invoices

| Component | Description |
|-----------|-------------|
| **InvoiceList** | Filterable table of invoices with number, date, patient, amount. |
| **InvoiceCard** | Card for a single invoice. Download PDF button. |
| **GenerateInvoiceButton** | Button on completed appointments to generate an invoice. |

### RGPD & Consent

| Component | Description |
|-----------|-------------|
| **SignaturePad** | Canvas-based digital signature capture (e.g. using `react-signature-canvas`). |
| **ConsentForm** | Full RGPD consent text + signature pad + submit. |
| **ConsentStatusBadge** | Green "Signed" or red "Pending" badge. |

### Settings

| Component | Description |
|-----------|-------------|
| **ProfessionalProfileForm** | Form: business name, tax ID, address, phone. |
| **ScheduleEditor** | Visual weekly grid where the professional drags to set working hours per day. |
| **BlockedTimeForm** | Form: start/end datetime, optional reason. |
| **AppointmentTypeForm** | Form: name, duration (minutes), price. |
| **GoogleCalendarToggle** | Connect/disconnect button + sync status. |

### Form Primitives (UI Kit)

| Component | Description |
|-----------|-------------|
| **Input** | Styled text input with label, error state, optional icon. |
| **Select** | Styled select/dropdown. |
| **Button** | Primary, secondary, danger, ghost variants. Loading state. |
| **Modal** | Centered modal with backdrop, close button, header/body/footer slots. |
| **Badge** | Small colored label (used for statuses). |
| **Card** | Container with border, padding, optional header. |
| **Table** | Responsive data table with sorting and pagination. |
| **Spinner** | Loading spinner for async states. |
| **EmptyState** | Illustration + message for empty lists. |
| **Toast** | Success/error notification popup. |
| **ConfirmDialog** | "Are you sure?" modal for destructive actions. |
| **DatePicker** | Date selection input. |
| **TimePicker** | Time selection input. |
| **Tabs** | Tab navigation within a page. |

---

## Summary

| Category | Count |
|----------|-------|
| Pages | 17 |
| Layout components | 5 |
| Navigation components | 3 |
| Feature components | ~40 |
| Form primitives (UI kit) | ~15 |
| **Total** | **~80** |
