import { Hono } from 'hono';
import { db } from '../db/index.js';
import { payments } from '../db/schema/payments.js';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';

const reportRoutes = new Hono();

reportRoutes.use('*', authMiddleware, requireRole('professional'));

// GET /reports/revenue/monthly
reportRoutes.get('/revenue/monthly', async (c) => {
  const profileId = getProfileId(c);
  const year = parseInt(c.req.query('year') || '');
  const month = parseInt(c.req.query('month') || '');

  if (!year || !month || month < 1 || month > 12) {
    throw new AppError(400, 'year and month query params required');
  }

  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  const result = await db.select({
    total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
    payment_count: sql<number>`COUNT(*)::int`,
  }).from(payments).where(and(
    eq(payments.professionalId, profileId),
    sql`${payments.paidAt} >= ${monthStart}`,
    sql`${payments.paidAt} <= ${monthEnd}`
  ));

  return c.json({
    year,
    month,
    total: parseFloat(result[0].total),
    payment_count: result[0].payment_count,
  });
});

// GET /reports/revenue/quarterly
reportRoutes.get('/revenue/quarterly', async (c) => {
  const profileId = getProfileId(c);
  const year = parseInt(c.req.query('year') || '');
  const quarter = parseInt(c.req.query('quarter') || '');

  if (!year || !quarter || quarter < 1 || quarter > 4) {
    throw new AppError(400, 'year and quarter query params required');
  }

  const startMonth = (quarter - 1) * 3;
  const byMonth: { month: number; total: number }[] = [];

  for (let m = 0; m < 3; m++) {
    const monthNum = startMonth + m + 1;
    const monthStart = new Date(year, startMonth + m, 1).toISOString();
    const monthEnd = new Date(year, startMonth + m + 1, 0, 23, 59, 59, 999).toISOString();

    const result = await db.select({
      total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
    }).from(payments).where(and(
      eq(payments.professionalId, profileId),
      sql`${payments.paidAt} >= ${monthStart}`,
      sql`${payments.paidAt} <= ${monthEnd}`
    ));

    byMonth.push({ month: monthNum, total: parseFloat(result[0].total) });
  }

  const total = byMonth.reduce((sum, m) => sum + m.total, 0);

  return c.json({
    year,
    quarter,
    total,
    by_month: byMonth,
  });
});

// GET /reports/revenue/by-method
reportRoutes.get('/revenue/by-method', async (c) => {
  const profileId = getProfileId(c);
  const year = parseInt(c.req.query('year') || '');
  const month = parseInt(c.req.query('month') || '');

  if (!year || !month || month < 1 || month > 12) {
    throw new AppError(400, 'year and month query params required');
  }

  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  const results = await db.select({
    method: payments.paymentMethod,
    total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
    count: sql<number>`COUNT(*)::int`,
  }).from(payments).where(and(
    eq(payments.professionalId, profileId),
    sql`${payments.paidAt} >= ${monthStart}`,
    sql`${payments.paidAt} <= ${monthEnd}`
  )).groupBy(payments.paymentMethod);

  const grandTotal = results.reduce((sum, r) => sum + parseFloat(r.total), 0);
  const byMethod = results.map((r) => ({
    method: r.method,
    total: parseFloat(r.total),
    count: r.count,
    percentage: grandTotal > 0 ? parseFloat(((parseFloat(r.total) / grandTotal) * 100).toFixed(2)) : 0,
  }));

  return c.json({
    year,
    month,
    total: grandTotal,
    by_method: byMethod,
  });
});

export default reportRoutes;
