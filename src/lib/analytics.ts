import { supabaseAdmin } from './supabase-admin';
import type { MonthlyRevenue, ProductStats } from '../types/admin';

export interface RecentOrder {
  id: string;
  product_title: string;
  member_email: string;
  amount_paid: number;
  payment_status: string;
  access_type: string | null;
  is_free: boolean;
  purchase_date: string;
  transaction_id?: string | null;
}

export interface AdminAnalyticsSnapshot {
  totalSales: number;
  totalRevenue: number;
  totalMembers: number;
  totalProducts: number;
  salesToday: number;
  revenueToday: number;
  aoaRevenue: number;
  aoaSales: number;
  aoaRevenueToday: number;
  aoaSalesToday: number;
  visitorsToday: number;
  totalDownloads: number;
  totalFavorites: number;
  totalNotifications: number;
  unreadNotifications: number;
  conversionRate: number;
  avgOrderValue: number;
  avgOrderValueAoa: number;
  topProductTitle: string | null;
  topProducts: ProductStats[];
  revenueByDay: MonthlyRevenue[];
  recentOrders: RecentOrder[];
  dataWarnings: string[];
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function last30DaysStartIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsSnapshot> {
  const todayStart = startOfTodayIso();
  const monthStart = last30DaysStartIso();

  const [
    purchasesRes,
    membersRes,
    productsRes,
    downloadsRes,
    favoritesRes,
    notificationsRes,
    recentViewsRes,
    newsViewsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('purchases')
      .select(
        `
        id,
        amount_paid,
        payment_status,
        access_type,
        purchase_date,
        product_id,
        transaction_id,
        products ( title, is_free )
      `
      )
      .gte('purchase_date', monthStart)
      .eq('payment_status', 'completed')
      .order('purchase_date', { ascending: false }),
    supabaseAdmin.from('members').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('downloads').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('favorites').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('notifications').select('id, read_status'),
    supabaseAdmin
      .from('recent_views')
      .select('id', { count: 'exact', head: true })
      .gte('viewed_at', todayStart),
    supabaseAdmin
      .from('news_views')
      .select('id', { count: 'exact', head: true })
      .gte('viewed_at', todayStart),
  ]);

  const criticalErrors: string[] = [];
  if (purchasesRes.error) criticalErrors.push(`purchases: ${purchasesRes.error.message}`);
  if (membersRes.error) criticalErrors.push(`members: ${membersRes.error.message}`);
  if (productsRes.error) criticalErrors.push(`products: ${productsRes.error.message}`);
  if (criticalErrors.length > 0) {
    throw new Error(`Falha ao carregar analytics: ${criticalErrors.join(' | ')}`);
  }

  const dataWarnings: string[] = [];
  if (downloadsRes.error) dataWarnings.push(`downloads: ${downloadsRes.error.message}`);
  if (favoritesRes.error) dataWarnings.push(`favorites: ${favoritesRes.error.message}`);
  if (notificationsRes.error) dataWarnings.push(`notifications: ${notificationsRes.error.message}`);
  if (recentViewsRes.error) dataWarnings.push(`recent_views: ${recentViewsRes.error.message}`);
  if (newsViewsRes.error) dataWarnings.push(`news_views: ${newsViewsRes.error.message}`);

  const purchases = purchasesRes.data ?? [];
  // Treat purchases with access_type='free'|'paid' as effectively completed
  const completed = purchases.map((p: any) => ({
    ...p,
    isAoa: typeof p.transaction_id === 'string' && p.transaction_id.startsWith('fastpay_')
  })).filter((p) => p.payment_status === 'completed');

  const completedUsd = completed.filter(p => !p.isAoa);
  const completedAoa = completed.filter(p => p.isAoa);

  // USD calculations
  const totalRevenue = completedUsd.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const totalSales = completedUsd.length;
  const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  const todayCompletedUsd = completedUsd.filter((p) => p.purchase_date >= todayStart);
  const salesToday = todayCompletedUsd.length;
  const revenueToday = todayCompletedUsd.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  // AOA calculations
  const aoaRevenue = completedAoa.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const aoaSales = completedAoa.length;
  const avgOrderValueAoa = aoaSales > 0 ? aoaRevenue / aoaSales : 0;

  const todayCompletedAoa = completedAoa.filter((p) => p.purchase_date >= todayStart);
  const aoaSalesToday = todayCompletedAoa.length;
  const aoaRevenueToday = todayCompletedAoa.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  const visitorsToday =
    (recentViewsRes.error ? 0 : recentViewsRes.count ?? 0) +
    (newsViewsRes.error ? 0 : newsViewsRes.count ?? 0);
  const conversionRate =
    visitorsToday > 0 ? Math.min(100, ((salesToday + aoaSalesToday) / visitorsToday) * 100) : 0;

  const productMap = new Map<string, { title: string; sales: number; revenue: number }>();
  for (const p of completed) {
    const id = p.product_id;
    const title =
      (p.products as { title?: string } | null)?.title ?? 'Produto';
    const current = productMap.get(id) ?? { title, sales: 0, revenue: 0 };
    current.sales += 1;
    current.revenue += Number(p.amount_paid || 0);
    productMap.set(id, current);
  }

  const topProducts: ProductStats[] = [...productMap.entries()]
    .map(([product_id, v]) => ({
      product_id,
      product_title: v.title,
      sales_count: v.sales,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 5);

  const topProductTitle = topProducts[0]?.product_title ?? null;

  const dayBuckets = new Map<string, { revenue: number; sales: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayBuckets.set(formatDayKey(d), { revenue: 0, sales: 0 });
  }
  for (const p of completedUsd) {
    const key = p.purchase_date.slice(0, 10);
    if (!dayBuckets.has(key)) dayBuckets.set(key, { revenue: 0, sales: 0 });
    const bucket = dayBuckets.get(key)!;
    bucket.revenue += Number(p.amount_paid || 0);
    bucket.sales += 1;
  }

  const revenueByDay: MonthlyRevenue[] = [...dayBuckets.entries()].map(([month, v]) => ({
    month,
    revenue: v.revenue,
    sales_count: v.sales,
  }));

  const { data: recentRows } = await supabaseAdmin
    .from('purchases')
    .select(
      `
      id,
      amount_paid,
      payment_status,
      access_type,
      purchase_date,
      transaction_id,
      products ( title, is_free ),
      members ( email )
    `
    )
    .order('purchase_date', { ascending: false })
    .limit(8);

  if (!recentRows) {
    dataWarnings.push('recent_orders: sem dados retornados');
  }

  const recentOrders: RecentOrder[] = (recentRows ?? []).map((row: any) => {
    const accessType = row.access_type as string | null;
    const rawStatus = row.payment_status as string;
    // Show effective status: if user has access, it's 'completed'
    const effectiveStatus =
      rawStatus === 'failed' || rawStatus === 'refunded'
        ? rawStatus
        : accessType === 'free' || accessType === 'paid'
          ? 'completed'
          : rawStatus;
    const productData = row.products as { title?: string; is_free?: boolean } | null;
    return {
      id: row.id,
      product_title: productData?.title ?? '—',
      member_email: (row.members as { email?: string } | null)?.email ?? '—',
      amount_paid: Number(row.amount_paid || 0),
      payment_status: effectiveStatus,
      access_type: accessType,
      is_free: productData?.is_free || Number(row.amount_paid || 0) === 0,
      purchase_date: row.purchase_date,
      transaction_id: row.transaction_id,
    };
  });

  const notifications = notificationsRes.data ?? [];

  return {
    totalSales,
    totalRevenue,
    totalMembers: membersRes.count ?? 0,
    totalProducts: productsRes.count ?? 0,
    salesToday,
    revenueToday,
    aoaRevenue,
    aoaSales,
    aoaRevenueToday,
    aoaSalesToday,
    visitorsToday,
    totalDownloads: downloadsRes.count ?? 0,
    totalFavorites: favoritesRes.count ?? 0,
    totalNotifications: notifications.length,
    unreadNotifications: notifications.filter((n) => !n.read_status).length,
    conversionRate,
    avgOrderValue,
    avgOrderValueAoa,
    topProductTitle,
    topProducts,
    revenueByDay,
    recentOrders,
    dataWarnings,
  };
}

export function formatCurrency(value: number, showFreeLabel = false): string {
  if (showFreeLabel && value === 0) return 'Grátis';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatKwanza(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
  }).format(value);
}
