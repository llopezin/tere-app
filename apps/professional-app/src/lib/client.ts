import type { AppType } from "@fisio-app/backend";
import { hc } from "hono/client";

// Hardcoded for now to avoid 'undefined' URL issues when VITE_API_URL is not set
export const client = hc<AppType>("http://localhost:3000/api/v1", {
    init: {
        credentials: 'include',
    }
},);
