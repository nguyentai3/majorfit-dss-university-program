import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';

export function useRealtimeUpdates(table, onUpdate, filters, options = {}) {
  const { user } = useAuth();
  const intervalRef = useRef(null);
  const isConnectedRef = useRef(false);
  const intervalMs = options.intervalMs ?? 15000;
  const filterSignature = JSON.stringify(filters || []);

  useEffect(() => {
    if (!user && !import.meta.env.DEV) {
      return undefined;
    }

    const userId = user?.id || 'demo-user';
    let tick = 0;

    const poll = () => {
      tick += 1;
      onUpdate({
        type: 'poll',
        table,
        userId,
        filters,
        tick,
        timestamp: new Date().toISOString(),
      });
    };

    isConnectedRef.current = true;
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      isConnectedRef.current = false;
    };
  }, [filterSignature, intervalMs, onUpdate, table, user?.id]);

  return {
    isConnected: isConnectedRef.current,
  };
}

export function useSavedProgramsUpdates(onUpdate) {
  const handleUpdate = async () => {
    try {
      const response = await fetch('/api/saved-programs');
      const data = await response.json();

      if (data.success) {
        onUpdate(data.items || []);
      }
    } catch (error) {
      console.error('Error refreshing saved programs:', error);
    }
  };

  return useRealtimeUpdates('saved_programs', handleUpdate);
}

export function useDashboardUpdates() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    completedAssessments: 0,
    savedPrograms: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user-stats');
      const data = await response.json();

      if (data.success) {
        setStats({
          completedAssessments: data.stats.completedAssessments || 0,
          savedPrograms: data.stats.savedPrograms || 0,
        });
      } else {
        setError('Failed to load dashboard statistics');
      }
    } catch (fetchError) {
      console.error('Error fetching dashboard stats:', fetchError);
      setError('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user || import.meta.env.DEV) {
      fetchDashboardStats();
    }
  }, [fetchDashboardStats, user]);

  const handleUpdate = useCallback(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const activityUpdates = useRealtimeUpdates('user_activities', handleUpdate);
  const programUpdates = useRealtimeUpdates('saved_programs', handleUpdate);
  const assessmentUpdates = useRealtimeUpdates('riasec_attempts', handleUpdate);
  const skillUpdates = useRealtimeUpdates('user_skills', handleUpdate);
  const achievementUpdates = useRealtimeUpdates('user_achievements', handleUpdate);

  return {
    stats,
    isLoading,
    error,
    isConnected:
      activityUpdates.isConnected ||
      programUpdates.isConnected ||
      assessmentUpdates.isConnected ||
      skillUpdates.isConnected ||
      achievementUpdates.isConnected,
    refresh: fetchDashboardStats,
  };
}

export function useProfileUpdates(onUpdate) {
  const handleUpdate = async () => {
    try {
      const response = await fetch('/api/profile');
      const profile = await response.json();
      onUpdate(profile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return useRealtimeUpdates('users', handleUpdate);
}
