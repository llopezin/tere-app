-- ============================================
-- 🌱 SEED DATA FOR fisio_practice DATABASE
-- ============================================
-- Run with: psql fisio_practice -f seed-practice.sql
--
-- This creates fake data for a physiotherapy clinic.
-- 2 professionals, 8 patients, appointment types,
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
  ('auth-pro-1',  'Ana García',      'ana@fisioclinic.es',     true, 'professional', NULL),
  ('auth-pro-2',  'Carlos Ruiz',     'carlos@fisioclinic.es',  true, 'professional', NULL),
  -- Patients (some have accounts, some don't — patients can be created by professionals)
  ('auth-pat-1',  'María López',     'maria.lopez@gmail.com',    true, 'patient', NULL),
  ('auth-pat-2',  'Pedro Martínez',  'pedro.martinez@gmail.com', true, 'patient', NULL),
  ('auth-pat-3',  'Lucía Fernández', 'lucia.f@hotmail.com',      true, 'patient', NULL);

-- ============================================
-- 2. PROFESSIONALS
-- ============================================

INSERT INTO professionals (id, auth_user_id, first_name, last_name, email, phone, tax_id, business_name, address_street, address_postal, address_city, address_province) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'auth-pro-1', 'Ana',    'García',  'ana@fisioclinic.es',    '+34 612 345 678', '12345678A', 'FisioClínic Ana',    'Calle Mayor 15',    '28001', 'Madrid',    'Madrid'),
  ('a2222222-2222-2222-2222-222222222222', 'auth-pro-2', 'Carlos', 'Ruiz',    'carlos@fisioclinic.es', '+34 698 765 432', '87654321B', 'Fisio Carlos Ruiz',  'Av. de la Constitución 42', '41001', 'Sevilla', 'Sevilla');

-- Update user.profile_id to link back
UPDATE "user" SET profile_id = 'a1111111-1111-1111-1111-111111111111' WHERE id = 'auth-pro-1';
UPDATE "user" SET profile_id = 'a2222222-2222-2222-2222-222222222222' WHERE id = 'auth-pro-2';

-- ============================================
-- 3. PATIENTS
-- ============================================
-- Some patients belong to Ana (pro-1), some to Carlos (pro-2)

INSERT INTO patients (id, auth_user_id, professional_id, first_name, last_name, nie, phone, email, date_of_birth, contact_method, clinical_notes, address_city, address_province) VALUES
  -- Ana's patients
  ('b0000001-0001-0001-0001-000000000001', 'auth-pat-1', 'a1111111-1111-1111-1111-111111111111', 'María',    'López',      'X1234567A', '+34 611 111 001', 'maria.lopez@gmail.com',    '1985-03-15', 'whatsapp', 'Lumbar pain, sedentary job',         'Madrid', 'Madrid'),
  ('b0000002-0002-0002-0002-000000000002', 'auth-pat-2', 'a1111111-1111-1111-1111-111111111111', 'Pedro',    'Martínez',   'Y2345678B', '+34 611 111 002', 'pedro.martinez@gmail.com', '1990-07-22', 'email',    'Knee rehabilitation post-surgery',   'Madrid', 'Madrid'),
  ('b0000003-0003-0003-0003-000000000003', NULL,          'a1111111-1111-1111-1111-111111111111', 'Elena',    'Sánchez',    'Z3456789C', '+34 611 111 003', 'elena.s@yahoo.com',        '1978-11-08', 'sms',      'Cervical tension, stress-related',   'Madrid', 'Madrid'),
  ('b0000004-0004-0004-0004-000000000004', NULL,          'a1111111-1111-1111-1111-111111111111', 'Javier',   'Hernández',  NULL,        '+34 611 111 004', NULL,                        '2001-01-30', 'whatsapp', 'Sports injury — shoulder',           'Alcalá de Henares', 'Madrid'),
  ('b0000005-0005-0005-0005-000000000005', NULL,          'a1111111-1111-1111-1111-111111111111', 'Carmen',   'Díaz',       'W4567890D', '+34 611 111 005', 'carmen.diaz@gmail.com',    '1965-06-12', 'whatsapp', 'Arthritis, mobility exercises',      'Madrid', 'Madrid'),
  -- Carlos's patients
  ('b0000006-0006-0006-0006-000000000006', 'auth-pat-3', 'a2222222-2222-2222-2222-222222222222', 'Lucía',    'Fernández',  'V5678901E', '+34 622 222 001', 'lucia.f@hotmail.com',      '1992-09-05', 'whatsapp', 'Postural correction program',        'Sevilla', 'Sevilla'),
  ('b0000007-0007-0007-0007-000000000007', NULL,          'a2222222-2222-2222-2222-222222222222', 'Diego',    'Moreno',     NULL,        '+34 622 222 002', 'diego.m@gmail.com',        '1988-04-18', 'email',    'Chronic back pain',                  'Sevilla', 'Sevilla'),
  ('b0000008-0008-0008-0008-000000000008', NULL,          'a2222222-2222-2222-2222-222222222222', 'Isabel',   'Torres',     'U6789012F', '+34 622 222 003', NULL,                        '1975-12-25', 'sms',      'Hip replacement recovery',           'Dos Hermanas', 'Sevilla');

-- Update patient profile links
UPDATE "user" SET profile_id = 'b0000001-0001-0001-0001-000000000001' WHERE id = 'auth-pat-1';
UPDATE "user" SET profile_id = 'b0000002-0002-0002-0002-000000000002' WHERE id = 'auth-pat-2';
UPDATE "user" SET profile_id = 'b0000006-0006-0006-0006-000000000006' WHERE id = 'auth-pat-3';

-- ============================================
-- 4. RGPD CONSENTS
-- ============================================
-- Spanish law requires patient data consent. Most have signed.

INSERT INTO rgpd_consents (id, patient_id, signed, signature_data, signed_at, ip_address) VALUES
  (gen_random_uuid(), 'b0000001-0001-0001-0001-000000000001', true,  'data:image/png;base64,iVBOR...sig1', '2025-01-10 10:00:00+01', '83.45.12.1'),
  (gen_random_uuid(), 'b0000002-0002-0002-0002-000000000002', true,  'data:image/png;base64,iVBOR...sig2', '2025-01-12 11:30:00+01', '83.45.12.2'),
  (gen_random_uuid(), 'b0000003-0003-0003-0003-000000000003', true,  'data:image/png;base64,iVBOR...sig3', '2025-02-01 09:00:00+01', '83.45.12.3'),
  (gen_random_uuid(), 'b0000004-0004-0004-0004-000000000004', false, NULL, NULL, NULL),  -- Javier hasn't signed yet!
  (gen_random_uuid(), 'b0000005-0005-0005-0005-000000000005', true,  'data:image/png;base64,iVBOR...sig5', '2025-02-15 14:00:00+01', '83.45.12.5'),
  (gen_random_uuid(), 'b0000006-0006-0006-0006-000000000006', true,  'data:image/png;base64,iVBOR...sig6', '2025-01-20 16:00:00+01', '88.12.34.1'),
  (gen_random_uuid(), 'b0000007-0007-0007-0007-000000000007', true,  'data:image/png;base64,iVBOR...sig7', '2025-03-01 10:30:00+01', '88.12.34.2'),
  (gen_random_uuid(), 'b0000008-0008-0008-0008-000000000008', true,  'data:image/png;base64,iVBOR...sig8', '2025-03-05 12:00:00+01', '88.12.34.3');

-- ============================================
-- 5. APPOINTMENT TYPES
-- ============================================
-- Each professional defines what services they offer

INSERT INTO appointment_types (id, professional_id, name, duration_minutes, price, is_active) VALUES
  -- Ana's services
  ('c0000001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'Fisioterapia General',     60, 50.00, true),
  ('c0000002-0002-0002-0002-000000000002', 'a1111111-1111-1111-1111-111111111111', 'Masaje Deportivo',         45, 40.00, true),
  ('c0000003-0003-0003-0003-000000000003', 'a1111111-1111-1111-1111-111111111111', 'Rehabilitación',           90, 70.00, true),
  ('c0000004-0004-0004-0004-000000000004', 'a1111111-1111-1111-1111-111111111111', 'Consulta Inicial',         30, 25.00, true),
  ('c0000005-0005-0005-0005-000000000005', 'a1111111-1111-1111-1111-111111111111', 'Terapia Manual (retired)', 60, 55.00, false),  -- inactive!
  -- Carlos's services
  ('c0000006-0006-0006-0006-000000000006', 'a2222222-2222-2222-2222-222222222222', 'Fisioterapia General',     60, 45.00, true),
  ('c0000007-0007-0007-0007-000000000007', 'a2222222-2222-2222-2222-222222222222', 'Pilates Terapéutico',      50, 35.00, true),
  ('c0000008-0008-0008-0008-000000000008', 'a2222222-2222-2222-2222-222222222222', 'Rehabilitación Cadera',    75, 65.00, true);

-- ============================================
-- 6. WORKING SCHEDULES
-- ============================================
-- day_of_week: 0=Monday, 1=Tuesday, ... 6=Sunday

INSERT INTO working_schedules (id, professional_id, day_of_week, start_time, end_time) VALUES
  -- Ana works Mon-Fri, morning + afternoon blocks
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 0, '09:00', '14:00'),  -- Monday AM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 0, '16:00', '20:00'),  -- Monday PM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 1, '09:00', '14:00'),  -- Tuesday AM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 1, '16:00', '20:00'),  -- Tuesday PM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 2, '09:00', '14:00'),  -- Wednesday AM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 3, '09:00', '14:00'),  -- Thursday AM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 3, '16:00', '20:00'),  -- Thursday PM
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 4, '09:00', '14:00'),  -- Friday AM
  -- Carlos works Mon-Thu
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 0, '10:00', '15:00'),
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 1, '10:00', '15:00'),
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 2, '10:00', '15:00'),
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 2, '17:00', '20:00'),
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 3, '10:00', '15:00');

-- ============================================
-- 7. BLOCKED TIMES (vacation, breaks)
-- ============================================

INSERT INTO blocked_times (id, professional_id, start_at, end_at) VALUES
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', '2025-12-23 00:00:00+01', '2026-01-02 23:59:59+01'),  -- Ana: Christmas break
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', '2026-04-06 00:00:00+02', '2026-04-10 23:59:59+02'),  -- Ana: Easter break
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', '2026-08-01 00:00:00+02', '2026-08-15 23:59:59+02');  -- Carlos: Summer vacation

-- ============================================
-- 8. BONOS (session packages)
-- ============================================

INSERT INTO bonos (id, professional_id, patient_id, appointment_type_id, name, price, total_sessions, sessions_used, status) VALUES
  ('d0000001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', 'Bono 10 Sesiones Fisio',  400.00, 10, 4,  'active'),
  ('d0000002-0002-0002-0002-000000000002', 'a1111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', 'c0000003-0003-0003-0003-000000000003', 'Bono 5 Rehabilitación',   300.00,  5, 5,  'exhausted'),
  ('d0000003-0003-0003-0003-000000000003', 'a2222222-2222-2222-2222-222222222222', 'b0000006-0006-0006-0006-000000000006', 'c0000007-0007-0007-0007-000000000007', 'Bono 8 Pilates',          240.00,  8, 2,  'active');

-- ============================================
-- 9. APPOINTMENTS
-- ============================================

INSERT INTO appointments (id, professional_id, patient_id, appointment_type_id, start_at, end_at, status, price, notes, bono_id, use_bono_session) VALUES
  -- Ana's past appointments
  ('e0000001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-03-10 09:00:00+01', '2026-03-10 10:00:00+01', 'completed',  50.00, 'Session 1 - Initial assessment',       'd0000001-0001-0001-0001-000000000001', true),
  ('e0000002-0002-0002-0002-000000000002', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-03-17 09:00:00+01', '2026-03-17 10:00:00+01', 'completed',  50.00, 'Session 2 - Exercises introduced',     'd0000001-0001-0001-0001-000000000001', true),
  ('e0000003-0003-0003-0003-000000000003', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-03-24 09:00:00+01', '2026-03-24 10:00:00+01', 'completed',  50.00, 'Session 3 - Good progress',            'd0000001-0001-0001-0001-000000000001', true),
  ('e0000004-0004-0004-0004-000000000004', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-03-31 09:00:00+01', '2026-03-31 10:00:00+01', 'no_show',    50.00, 'Patient did not attend',               'd0000001-0001-0001-0001-000000000001', true),
  ('e0000005-0005-0005-0005-000000000005', 'a1111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', 'c0000003-0003-0003-0003-000000000003', '2026-03-11 10:00:00+01', '2026-03-11 11:30:00+01', 'completed',  70.00, 'Knee rehab - range of motion test',    NULL, false),
  ('e0000006-0006-0006-0006-000000000006', 'a1111111-1111-1111-1111-111111111111', 'b0000003-0003-0003-0003-000000000003', 'c0000002-0002-0002-0002-000000000002', '2026-03-12 16:00:00+01', '2026-03-12 16:45:00+01', 'completed',  40.00, 'Neck and shoulder tension release',    NULL, false),
  ('e0000007-0007-0007-0007-000000000007', 'a1111111-1111-1111-1111-111111111111', 'b0000005-0005-0005-0005-000000000005', 'c0000001-0001-0001-0001-000000000001', '2026-03-20 11:00:00+01', '2026-03-20 12:00:00+01', 'cancelled',  50.00, 'Cancelled by patient',                 NULL, false),
  -- Ana's upcoming appointments
  ('e0000008-0008-0008-0008-000000000008', 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '2026-04-07 09:00:00+02', '2026-04-07 10:00:00+02', 'scheduled',  50.00, 'Session 5 - Follow up',                'd0000001-0001-0001-0001-000000000001', true),
  ('e0000009-0009-0009-0009-000000000009', 'a1111111-1111-1111-1111-111111111111', 'b0000003-0003-0003-0003-000000000003', 'c0000002-0002-0002-0002-000000000002', '2026-04-07 16:00:00+02', '2026-04-07 16:45:00+02', 'scheduled',  40.00, NULL,                                   NULL, false),
  ('e0000010-0010-0010-0010-000000000010', 'a1111111-1111-1111-1111-111111111111', 'b0000005-0005-0005-0005-000000000005', 'c0000001-0001-0001-0001-000000000001', '2026-04-14 11:00:00+02', '2026-04-14 12:00:00+02', 'scheduled',  50.00, 'Rescheduled from March',               NULL, false),
  -- Carlos's appointments
  ('e0000011-0011-0011-0011-000000000011', 'a2222222-2222-2222-2222-222222222222', 'b0000006-0006-0006-0006-000000000006', 'c0000007-0007-0007-0007-000000000007', '2026-03-18 10:00:00+01', '2026-03-18 10:50:00+01', 'completed',  35.00, 'Pilates - core stability',             'd0000003-0003-0003-0003-000000000003', true),
  ('e0000012-0012-0012-0012-000000000012', 'a2222222-2222-2222-2222-222222222222', 'b0000006-0006-0006-0006-000000000006', 'c0000007-0007-0007-0007-000000000007', '2026-03-25 10:00:00+01', '2026-03-25 10:50:00+01', 'completed',  35.00, 'Pilates - added resistance bands',     'd0000003-0003-0003-0003-000000000003', true),
  ('e0000013-0013-0013-0013-000000000013', 'a2222222-2222-2222-2222-222222222222', 'b0000007-0007-0007-0007-000000000007', 'c0000006-0006-0006-0006-000000000006', '2026-03-19 11:00:00+01', '2026-03-19 12:00:00+01', 'completed',  45.00, 'Lower back assessment',                NULL, false),
  ('e0000014-0014-0014-0014-000000000014', 'a2222222-2222-2222-2222-222222222222', 'b0000008-0008-0008-0008-000000000008', 'c0000008-0008-0008-0008-000000000008', '2026-03-20 12:00:00+01', '2026-03-20 13:15:00+01', 'completed',  65.00, 'Hip rehab - mobility drills',          NULL, false),
  ('e0000015-0015-0015-0015-000000000015', 'a2222222-2222-2222-2222-222222222222', 'b0000007-0007-0007-0007-000000000007', 'c0000006-0006-0006-0006-000000000006', '2026-04-08 11:00:00+02', '2026-04-08 12:00:00+02', 'scheduled',  45.00, 'Follow-up session',                    NULL, false);

-- ============================================
-- 10. BONO TRANSACTIONS
-- ============================================

INSERT INTO bono_transactions (id, bono_id, appointment_id, type) VALUES
  (gen_random_uuid(), 'd0000001-0001-0001-0001-000000000001', 'e0000001-0001-0001-0001-000000000001', 'deduction'),
  (gen_random_uuid(), 'd0000001-0001-0001-0001-000000000001', 'e0000002-0002-0002-0002-000000000002', 'deduction'),
  (gen_random_uuid(), 'd0000001-0001-0001-0001-000000000001', 'e0000003-0003-0003-0003-000000000003', 'deduction'),
  (gen_random_uuid(), 'd0000001-0001-0001-0001-000000000001', 'e0000004-0004-0004-0004-000000000004', 'deduction'),
  (gen_random_uuid(), 'd0000003-0003-0003-0003-000000000003', 'e0000011-0011-0011-0011-000000000011', 'deduction'),
  (gen_random_uuid(), 'd0000003-0003-0003-0003-000000000003', 'e0000012-0012-0012-0012-000000000012', 'deduction');

-- ============================================
-- 11. PAYMENTS
-- ============================================

INSERT INTO payments (id, professional_id, patient_id, appointment_id, bono_id, amount, payment_method, status, paid_at, notes) VALUES
  -- Individual payments for Ana's patients
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', 'e0000005-0005-0005-0005-000000000005', NULL,   70.00, 'card',  'paid', '2026-03-11 11:35:00+01', NULL),
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'b0000003-0003-0003-0003-000000000003', 'e0000006-0006-0006-0006-000000000006', NULL,   40.00, 'bizum', 'paid', '2026-03-12 16:50:00+01', NULL),
  -- Bono purchase payments
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', NULL, 'd0000001-0001-0001-0001-000000000001', 400.00, 'card',  'paid', '2026-03-08 10:00:00+01', 'Bono 10 sesiones - fisioterapia'),
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', NULL, 'd0000002-0002-0002-0002-000000000002', 300.00, 'card',  'paid', '2026-01-15 10:00:00+01', 'Bono rehabilitación'),
  -- Carlos's payments
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'b0000007-0007-0007-0007-000000000007', 'e0000013-0013-0013-0013-000000000013', NULL,   45.00, 'cash',  'paid', '2026-03-19 12:10:00+01', NULL),
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'b0000008-0008-0008-0008-000000000008', 'e0000014-0014-0014-0014-000000000014', NULL,   65.00, 'bizum', 'paid', '2026-03-20 13:20:00+01', NULL),
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'b0000006-0006-0006-0006-000000000006', NULL, 'd0000003-0003-0003-0003-000000000003', 240.00, 'card',  'paid', '2026-03-15 16:00:00+01', 'Bono pilates');

-- ============================================
-- 12. PATIENT BILLING DATA (for invoices)
-- ============================================

INSERT INTO patient_billing_data (id, patient_id, billing_name, address_street, address_postal, address_city, address_province, address_country) VALUES
  (gen_random_uuid(), 'b0000001-0001-0001-0001-000000000001', 'María López García',        'Calle Serrano 45, 2ºB',    '28006', 'Madrid',  'Madrid',  'España'),
  (gen_random_uuid(), 'b0000002-0002-0002-0002-000000000002', 'Pedro Martínez Sociedad SL', 'Av. América 12, Oficina 3', '28028', 'Madrid',  'Madrid',  'España'),
  (gen_random_uuid(), 'b0000008-0008-0008-0008-000000000008', 'Isabel Torres Vega',         'Calle Real 8',              '41702', 'Dos Hermanas', 'Sevilla', 'España');

-- ============================================
-- 13. INVOICES
-- ============================================

INSERT INTO invoices (id, invoice_number, professional_id, patient_id, appointment_id, payment_id, amount, description, prof_name, prof_tax_id, prof_address, patient_name, patient_tax_id, patient_address, issued_at) VALUES
  (gen_random_uuid(), '2026-0001', 'a1111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', 'e0000005-0005-0005-0005-000000000005', NULL, 70.00, 'Rehabilitación - 11/03/2026',  'FisioClínic Ana',   '12345678A', 'Calle Mayor 15, 28001 Madrid',      'Pedro Martínez Sociedad SL', NULL, 'Av. América 12, Oficina 3, 28028 Madrid', '2026-03-11 12:00:00+01'),
  (gen_random_uuid(), '2026-0002', 'a2222222-2222-2222-2222-222222222222', 'b0000008-0008-0008-0008-000000000008', 'e0000014-0014-0014-0014-000000000014', NULL, 65.00, 'Rehabilitación Cadera - 20/03/2026', 'Fisio Carlos Ruiz', '87654321B', 'Av. de la Constitución 42, 41001 Sevilla', 'Isabel Torres Vega', NULL, 'Calle Real 8, 41702 Dos Hermanas', '2026-03-20 14:00:00+01');

-- ============================================
-- ✅ DONE! Your practice database is ready.
-- ============================================
-- Connect with:   psql fisio_practice
-- List tables:    \dt
-- Explore data:   SELECT * FROM patients LIMIT 5;
-- ============================================
