// Falls back to the local backend so dev works without a .env file
export const API_URL: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
