import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseAdmin } from '../lib/supabase-admin';
import {
  fetchAdminAnalytics,
  type AdminAnalyticsSnapshot,
} from '../lib/analytics';

const REFRESH_DEBOUNCE_MS = 600;

const emptySnapshot: AdminAnalyticsSnapshot = {
  totalSales: 0,
  totalRevenue: 0,
  totalMembers: 0,
  totalProducts: 0,
  salesToday: 0,
  revenueToday: 0,
  visitorsToday: 0,
  totalDownloads: 0,
  totalFavorites: 0,
  totalNotifications: 0,
  unreadNotifications: 0,
  conversionRate: 0,
  avgOrderValue: 0,
  topProductTitle: null,
  topProducts: [],
  revenueByDay: [],
  recentOrders: [],
};

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const snapshot = await fetchAdminAnalytics();
      setData(snapshot);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[analytics] refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar analytics');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refresh(true);
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    void refresh();

    const channel = supabaseAdmin
      .channel('admin-analytics-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'downloads' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'favorites' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recent_views' },
        scheduleRefresh
      )
      .subscribe();

    const interval = setInterval(() => {
      void refresh(true);
    }, 5 * 60 * 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(interval);
      void supabaseAdmin.removeChannel(channel);
    };
  }, [refresh, scheduleRefresh]);

  return { data, loading, error, lastUpdated, refresh };
}
