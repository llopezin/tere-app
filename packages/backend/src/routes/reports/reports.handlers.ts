import type { AppRouteHandler } from '../../lib/types.js';
import type {
  RevenueMonthlyRoute,
  RevenueQuarterlyRoute,
  RevenueByMethodRoute,
} from './reports.routes.js';
import { db } from '../../db/index.js';
import { payments } from '../../db/schema/payments.js';
import { eq, and, sql } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const revenueMonthly: AppRouteHandler<RevenueMonthlyRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { year, month } = c.req.valid('query');
  if (!year || !month || month < 1 || month > 12) throw new AppError(400, 'year and month query params required');
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
  const result = await db.select({
    total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
    payment_count: sql<number>`COUNT(*)::int`,
  }).from(payments).where(and(
    eq(payments.professionalId, profileId),
    sql`${payments.paidAt} >= ${monthStart}`,
    sql`${payments.paidAt} <= ${monthEnd}`,
  ));
  return c.json({
    year,
    month,
    total: parseFloat(result[0].total),
    payment_count: result[0].payment_count,
  }, HttpStatusCodes.OK);
};

export const revenueQuarterly: AppRouteHandler<RevenueQuarterlyRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { year, quarter } = c.req.valid('query');
  if (!year || !quarter || quarter < 1 || quarter > 4) throw new AppError(400, 'year and quarter query params required');
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
      sql`${payments.paidAt} <= ${monthEnd}`,
    ));
    byMonth.push({ month: monthNum, total: parseFloat(result[0].total) });
  }
  const total = byMonth.reduce((sum, m) => sum + m.total, 0);
  return c.json({ year, quarter, total, by_month: byMonth }, HttpStatusCodes.OK);
};

export const revenueByMethod: AppRouteHandler<RevenueByMethodRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { year, month } = c.req.valid('query');
  if (!year || !month || month < 1 || month > 12) throw new AppError(400, 'year and month query params required');
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
  const results = await db.select({
    method: payments.paymentMethod,
    total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
    count: sql<number>`COUNT(*)::int`,
  }).from(payments).where(and(
    eq(payments.professionalId, profileId),
    sql`${payments.paidAt} >= ${monthStart}`,
    sql`${payments.paidAt} <= ${monthEnd}`,
  )).groupBy(payments.paymentMethod);
  const grandTotal = results.reduce((sum, r) => sum + parseFloat(r.total), 0);
  const byMethod = results.map((r) => ({
    method: r.method,
    total: parseFloat(r.total),
    count: r.count,
    percentage: grandTotal > 0 ? parseFloat(((parseFloat(r.total) / grandTotal) * 100).toFixed(2)) : 0,
  }));
  return c.json({ year, month, total: grandTotal, by_method: byMethod }, HttpStatusCodes.OK);
};
