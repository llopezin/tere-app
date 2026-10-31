-- ============================================
-- 🌱 SEED DATA FOR fisio_practice DATABASE
-- ============================================
-- Run with: psql fisio_practice -f seed-practice.sql
--
-- This creates fake data for a physiotherapy clinic.
-- 1 professional, 5 patients, appointment types,
-- schedules, appointments, bonos, payments, and invoices.
-- ============================================

-- Clean existing data (in correct order to respect foreign keys)
-- Foreign keys mean you must delete child tables before parent tables!
TRUNCATE
  bono_transactions, invoices, payments, appointments,
  bonos, blocked_times, working_schedules, appointment_types,
  rgpd_consents, patient_billing_data, patients,
  professionals, session, account, verification, "user"
CASCADE;

-- ============================================
-- 1. AUTH USERS (the "user" table from Better Auth)
-- ============================================
-- These represent login accounts. Each professional/patient links to one.

INSERT INTO "user" (id, name, email, email_verified, role, profile_id) VALUES
  -- Professionals
  ('auth-pro-1', 'Teresa Quintana García',  'teresaquintanagarcia@gmail.com', true, 'professional', NULL),
  -- Patients (some have accounts, some don't — patients can be created by professionals)
  ('auth-pat-1', 'María López',    'maria.lopez@gmail.com',    true, 'patient', NULL),
  ('auth-pat-2', 'Pedro Martínez', 'pedro.martinez@gmail.com', true, 'patient', NULL);

-- ============================================
-- 2. PROFESSIONALS
-- ============================================

INSERT INTO professionals (id, auth_user_id, first_name, last_name, email, phone, tax_id, business_name, address_street, address_postal, address_city, address_province) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'auth-pro-1', 'Teresa', 'Quintana García', 'teresaquintanagarcia@gmail.com', '+34 612 345 678', '12345678A', 'FisioClínic Teresa', 'Calle Mayor 15', '28001', 'Madrid', 'Madrid');

-- Update user.profile_id to link back
UPDATE "user" SET profile_id = 'a1111111-1111-1111-1111-111111111111' WHERE id = 'auth-pro-1';

-- ============================================
-- 3. PATIENTS
-- ============================================

INSERT INTO patients (id, auth_user_id, professional_id, first_name, last_name, nie, phone, email, date_of_birth, contact_method, clinical_notes, address_city, address_province) VALUES
  ('b0000001-0001-0001-0001-000000000001', 'auth-pat-1', 'a1111111-1111-1111-1111-111111111111', 'María',  'López',     'X1234567A', '+34 611 111 001', 'maria.lopez@gmail.com',    '1985-03-15', 'whatsapp', 'Lumbar pain, sedentary job',       'Madrid',              'Madrid'),
  ('b0000002-0002-0002-0002-000000000002', 'auth-pat-2', 'a1111111-1111-1111-1111-111111111111', 'Pedro',  'Martínez',  'Y2345678B', '+34 611 111 002', 'pedro.martinez@gmail.com', '1990-07-22', 'email',    'Knee rehabilitation post-surgery', 'Madrid',              'Madrid'),
  ('b0000003-0003-0003-0003-000000000003', NULL,         'a1111111-1111-1111-1111-111111111111', 'Elena',  'Sánchez',   'Z3456789C', '+34 611 111 003', 'elena.s@yahoo.com',        '1978-11-08', 'sms',      'Cervical tension, stress-related', 'Madrid',              'Madrid'),
  ('b0000004-0004-0004-0004-000000000004', NULL,         'a1111111-1111-1111-1111-111111111111', 'Javier', 'Hernández', NULL,        '+34 611 111 004', NULL,                        '2001-01-30', 'whatsapp', 'Sports injury — shoulder',         'Alcalá de Henares',   'Madrid'),
  ('b0000005-0005-0005-0005-000000000005', NULL,         'a1111111-1111-1111-1111-111111111111', 'Carmen', 'Díaz',      'W4567890D', '+34 611 111 005', 'carmen.diaz@gmail.com',    '1965-06-12', 'whatsapp', 'Arthritis, mobility exercises',    'Madrid',              'Madrid');

-- Update patient profile links
UPDATE "user" SET profile_id = 'b0000001-0001-0001-0001-000000000001' WHERE id = 'auth-pat-1';
UPDATE "user" SET profile_id = 'b0000002-0002-0002-0002-000000000002' WHERE id = 'auth-pat-2';

-- ============================================
-- 4. RGPD CONSENTS
-- ============================================
-- Spanish law requires patient data consent. Most have signed.

INSERT INTO rgpd_consents (id, patient_id, signed, signature_data, signed_at, ip_address) VALUES
  (gen_random_uuid(), 'b0000001-0001-0001-0001-000000000001', true,  'data:image/png;base64,iVBOR...sig1', '2025-01-10 10:00:00+01', '83.45.12.1'),
  (gen_random_uuid(), 'b0000002-0002-0002-0002-000000000002', true,  'data:image/png;base64,iVBOR...sig2', '2025-01-12 11:30:00+01', '83.45.12.2'),
  (gen_random_uuid(), 'b0000003-0003-0003-0003-000000000003', true,  'data:image/png;base64,iVBOR...sig3', '2025-02-01 09:00:00+01', '83.45.12.3'),
  (gen_random_uuid(), 'b0000004-0004-0004-0004-000000000004', false, NULL,                                 NULL,                     NULL),
  (gen_random_uuid(), 'b0000005-0005-0005-0005-000000000005', true,  'data:image/png;base64,iVBOR...sig5', '2025-02-15 14:00:00+01', '83.45.12.5');

-- ============================================
-- 5. APPOINTMENT TYPES
-- ============================================
-- Each professional defines what services they offer

INSERT INTO appointment_types (id, professional_id, name, duration_minutes, price, is_active) VALUES
  ('c0000001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'Fisioterapia Deportiva',   45, 50.00, true),
  ('c0000003-0003-0003-0003-000000000003', 'a1111111-1111-1111-1111-111111111111', 'Fisioterapia Neurológica', 45, 45.00, true),
  ('c0000004-0004-0004-0004-000000000004', 'a1111111-1111-1111-1111-111111111111', 'Consulta Inicial',         45, 50.00, true),
  ('c0000005-0005-0005-0005-000000000005', 'a1111111-1111-1111-1111-111111111111', 'Terapia Manual (retired)', 60, 55.00, false);

-- ============================================
-- 6. WORKING SCHEDULES
-- ============================================
-- day_of_week: 0=Monday, 1=Tuesday, ... 6=Sunday

INSERT INTO working_schedules (id, professional_id, day_of_week, start_time, end_time) VALUES
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 0, '09:00', '14:00'),  -- Monday AM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 0, '16:00', '20:00'),  -- Monday PM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 1, '09:00', '14:00'),  -- Tuesday AM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 1, '16:00', '20:00'),  -- Tuesday PM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 2, '09:00', '14:00'),  -- Wednesday AM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 3, '09:00', '14:00'),  -- Thursday AM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 3, '16:00', '20:00'),  -- Thursday PM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 4, '09:00', '14:00');  -- Friday AM

-- ============================================
-- 7. BLOCKED TIMES (vacation, breaks)
-- ============================================

INSERT INTO blocked_times (id, professional_id, start_at, end_at) VALUES
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', '2025-12-23 00:00:00+01', '2026-01-02 23:59:59+01'),  -- Christmas break
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', '2026-04-06 00:00:00+02', '2026-04-10 23:59:59+02');  -- Easter break

-- ============================================
-- 8. BONOS (session packages)
-- ============================================

INSERT INTO bonos (id, professional_id, patient_id, appointment_type_id, name, price, total_sessions, sessions_used, status) VALUES
  ('d0000001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', 'Bono 10 Sesiones Fisio', 400.00, 10, 4, 'active');

-- ============================================
-- 9. APPOINTMENTS
-- ============================================

INSERT INTO appointments (id, professional_id, patient_id, appointment_type_id, start_at, end_at, status, price, notes, bono_id, use_bono_session) VALUES
  ('e0000001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-03-10 09:00:00+01', '2026-03-10 10:00:00+01', 'completed', 50.00, 'Session 1 - Initial assessment',     'd0000001-0001-0001-0001-000000000001', true),
  ('e0000002-0002-0002-0002-000000000002', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-03-17 09:00:00+01', '2026-03-17 10:00:00+01', 'completed', 50.00, 'Session 2 - Exercises introduced',   'd0000001-0001-0001-0001-000000000001', true),
  ('e0000003-0003-0003-0003-000000000003', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-03-24 09:00:00+01', '2026-03-24 10:00:00+01', 'completed', 50.00, 'Session 3 - Good progress',          'd0000001-0001-0001-0001-000000000001', true),
  ('e0000004-0004-0004-0004-000000000004', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-03-31 09:00:00+01', '2026-03-31 10:00:00+01', 'no_show',   50.00, 'Patient did not attend',             'd0000001-0001-0001-0001-000000000001', true),
  ('e0000005-0005-0005-0005-000000000005', 'a1111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', 'c0000003-0003-0003-0003-000000000003', '2026-03-11 10:00:00+01', '2026-03-11 11:30:00+01', 'completed', 70.00, 'Knee rehab - range of motion test',  NULL,                                          false),
  ('e0000006-0006-0006-0006-000000000006', 'a1111111-1111-1111-1111-111111111111', 'b0000003-0003-0003-0003-000000000003', 'c0000004-0004-0004-0004-000000000004', '2026-03-12 16:00:00+01', '2026-03-12 16:45:00+01', 'completed', 40.00, 'Neck and shoulder tension release',  NULL,                                          false),
  ('e0000007-0007-0007-0007-000000000007', 'a1111111-1111-1111-1111-111111111111', 'b0000005-0005-0005-0005-000000000005', 'c0000001-0001-0001-0001-000000000001', '2026-03-20 11:00:00+01', '2026-03-20 12:00:00+01', 'cancelled', 50.00, 'Cancelled by patient',               NULL,                                          false),
  ('e0000008-0008-0008-0008-000000000008', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-04-07 09:00:00+02', '2026-04-07 10:00:00+02', 'scheduled', 50.00, 'Session 5 - Follow up',              'd0000001-0001-0001-0001-000000000001', true),
  ('e0000009-0009-0009-0009-000000000009', 'a1111111-1111-1111-1111-111111111111', 'b0000003-0003-0003-0003-000000000003', 'c0000004-0004-0004-0004-000000000004', '2026-04-07 16:00:00+02', '2026-04-07 16:45:00+02', 'scheduled', 40.00, NULL,                                 NULL,                                          false),
  ('e0000010-0010-0010-0010-000000000010', 'a1111111-1111-1111-1111-111111111111', 'b0000005-0005-0005-0005-000000000005', 'c0000001-0001-0001-0001-000000000001', '2026-04-14 11:00:00+02', '2026-04-14 12:00:00+02', 'scheduled', 50.00, 'Rescheduled from March',             NULL,                                          false);

-- ============================================
-- 10. BONO TRANSACTIONS
-- ============================================

INSERT INTO bono_transactions (id, bono_id, appointment_id, type) VALUES
  (gen_random_uuid(), 'd0000001-0001-0001-0001-000000000001', 'e0000001-0001-0001-0001-000000000001', 'deduction'),
  (gen_random_uuid(), 'd0000001-0001-0001-0001-000000000001', 'e0000002-0002-0002-0002-000000000002', 'deduction'),
  (gen_random_uuid(), 'd0000001-0001-0001-0001-000000000001', 'e0000003-0003-0003-0003-000000000003', 'deduction'),
  (gen_random_uuid(), 'd0000001-0001-0001-0001-000000000001', 'e0000004-0004-0004-0004-000000000004', 'deduction');

-- ============================================
-- 11. PAYMENTS
-- ============================================

INSERT INTO payments (id, professional_id, patient_id, appointment_id, bono_id, amount, payment_method, status, paid_at, notes) VALUES
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', 'e0000005-0005-0005-0005-000000000005', NULL,                                          70.00,  'card',  'paid', '2026-03-11 11:35:00+01', NULL),
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'b0000003-0003-0003-0003-000000000003', 'e0000006-0006-0006-0006-000000000006', NULL,                                          40.00,  'bizum', 'paid', '2026-03-12 16:50:00+01', NULL),
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', NULL,                                          'd0000001-0001-0001-0001-000000000001', 400.00, 'card',  'paid', '2026-03-08 10:00:00+01', 'Bono 10 sesiones - fisioterapia');

-- ============================================
-- 12. PATIENT BILLING DATA (for invoices)
-- ============================================

INSERT INTO patient_billing_data (id, patient_id, billing_name, address_street, address_postal, address_city, address_province, address_country) VALUES
  (gen_random_uuid(), 'b0000001-0001-0001-0001-000000000001', 'María López García',         'Calle Serrano 45, 2ºB',     '28006', 'Madrid', 'Madrid', 'España'),
  (gen_random_uuid(), 'b0000002-0002-0002-0002-000000000002', 'Pedro Martínez Sociedad SL', 'Av. América 12, Oficina 3', '28028', 'Madrid', 'Madrid', 'España');

-- ============================================
-- 13. INVOICES
-- ============================================

INSERT INTO invoices (id, invoice_number, professional_id, patient_id, appointment_id, payment_id, amount, description, prof_name, prof_tax_id, prof_address, patient_name, patient_tax_id, patient_address, issued_at) VALUES
  (gen_random_uuid(), '2026-0001', 'a1111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', 'e0000005-0005-0005-0005-000000000005', NULL, 70.00, 'Rehabilitación - 11/03/2026', 'FisioClínic Teresa', '12345678A', 'Calle Mayor 15, 28001 Madrid', 'Pedro Martínez Sociedad SL', NULL, 'Av. América 12, Oficina 3, 28028 Madrid', '2026-03-11 12:00:00+01');

-- ============================================
-- ✅ DONE! Your practice database is ready.
-- ============================================
-- Connect with:   psql fisio_practice
-- List tables:    \dt
-- Explore data:   SELECT * FROM patients LIMIT 5;
-- ============================================
