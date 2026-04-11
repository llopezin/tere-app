import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^\d{9,}$/, "El teléfono debe contener al menos 9 dígitos numéricos");
