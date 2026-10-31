// Falls back to the local backend so dev works without a .env file
export const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:3000";
