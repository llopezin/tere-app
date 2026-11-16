import { z } from "zod";

// Accepts formatting characters (+, spaces, hyphens, parentheses) but requires
// at least 9 digits when stripped — matches the "+34 600 000 000" placeholder.
export const phoneSchema = z
  .string()
  .refine(
    (value) => /^[+\d\s()-]+$/.test(value) && value.replace(/\D/g, "").length >= 9,
    "El teléfono debe contener al menos 9 dígitos numéricos",
  )
  // Phones are unique per patient: store one spelling so "600 111 222" can't bypass "600111222"
  .transform((value) => value.replace(/[\s()-]/g, ""));
