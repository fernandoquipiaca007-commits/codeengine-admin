import { useEffect, useRef } from 'react';
import { supabaseAdmin } from '../lib/supabase-admin';
import { useToast } from '../contexts/ToastContext';

export function AdminNotificationWatcher() {
  const { notifySuccess } = useToast();
  const lastCountRef = useRef<number | null>(null);

  // Request browser Notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Web Audio API synthesized alert sound (double-beep)
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playBeep = (delay: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // high note (A5)
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        // fade out
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      };

      playBeep(0);
      playBeep(0.2); // double beep
    } catch (err) {
      console.warn('[audio-alert] Web Audio alert blocked or failed:', err);
    }
  };

  useEffect(() => {
    let active = true;

    const checkPendingWithdrawals = async () => {
      try {
        const { count, error } = await supabaseAdmin
          .from('withdrawal_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (error) {
          console.warn('[AdminWatcher] failed to query withdrawals count:', error);
          return;
        }

        const currentCount = count ?? 0;

        if (lastCountRef.current !== null && currentCount > lastCountRef.current) {
          const delta = currentCount - lastCountRef.current;
          const title = 'Novo Saque Pendente!';
          const body = delta === 1
            ? 'Há 1 nova solicitação de saque de colaborador aguardando revisão.'
            : `Há ${delta} novas solicitações de saques de colaboradores aguardando revisão.`;

          // 1. Trigger Audio alert
          playAlertSound();

          // 2. Trigger custom context Toast
          notifySuccess(`${title} ${body}`);

          // 3. Trigger native HTML5 Browser Notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/favicon.ico'
            });
          }
        }

        // Always update last count reference
        lastCountRef.current = currentCount;
      } catch (err) {
        console.error('[AdminWatcher] unexpected error:', err);
      }
    };

    // Run first check immediately on mount
    checkPendingWithdrawals();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      if (active) checkPendingWithdrawals();
    }, 30_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [notifySuccess]);

  return null; // Component runs strictly as a background listener
}
