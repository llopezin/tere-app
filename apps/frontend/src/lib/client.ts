import type { AppType } from "@fisio-app/backend";
import { hc } from "hono/client";

// AppType = typeof api (routes at /appointments, /professionals, etc.)
// Base URL includes /api/v1 so hc generates correct full paths
export const client = hc<AppType>(`${import.meta.env.VITE_API_URL}/api/v1`, {
    init: {
        credentials: 'include',
    }
},);