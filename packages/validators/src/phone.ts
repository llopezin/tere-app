import { z } from "zod";

// Accepts formatting characters (+, spaces, hyphens, parentheses) but requires
// at least 9 digits when stripped — matches the "+34 600 000 000" placeholder.
export const phoneSchema = z
  .string()
  .refine(
    (value) => /^[+\d\s()-]+$/.test(value) && value.replace(/\D/g, "").length >= 9,
    "El teléfono debe contener al menos 9 dígitos numéricos",
  );
