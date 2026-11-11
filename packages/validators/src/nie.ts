import { z } from "zod";

export const nieSchema = z
  .string()
  .regex(
    /^(\d{8}|[XYZxyz]\d{7})[A-Za-z]$/,
    "El DNI/NIE no tiene un formato válido (ej: 12345678A o X1234567A)",
  )
  // One spelling per document, so the unique DNI/NIE cannot be bypassed with lowercase
  .transform((value) => value.toUpperCase());
