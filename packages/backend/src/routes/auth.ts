import { Hono } from 'hono';
import { auth } from '../lib/auth.js';

const authRoutes = new Hono();

// Better Auth handles all auth endpoints:
// POST /auth/sign-up/email — register with email & password
// POST /auth/sign-in/email — login with email & password
// POST /auth/sign-out        — end session
// GET  /auth/get-session     — get current session
// POST /auth/forget-password — request password reset
// POST /auth/reset-password  — reset password with token
authRoutes.on(['POST', 'GET'], '/*', (c) => {
  return auth.handler(c.req.raw);
});

export default authRoutes;
