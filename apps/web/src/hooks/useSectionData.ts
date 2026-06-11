import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { SectionType, SectionEntry } from '../types/resume';

export function useSectionData<T extends SectionEntry>(profileId: string, sectionType: SectionType, onDataChange?: () => void) {
  const [entries, setEntries] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePath = `/profiles/${profileId}/sections/${sectionType}`;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<T[]>(basePath);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load section');
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async (entry: Omit<T, 'id'>) => {
    setSaving(true);
    setError(null);
    try {
      const created = await apiClient.post<T>(basePath, entry);
      setEntries((prev) => [...prev, created]);
      onDataChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = async (id: string, entry: Partial<T>) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.put<T>(`${basePath}/${id}`, entry);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      onDataChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.delete(`${basePath}/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      onDataChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setSaving(false);
    }
  };

  return { entries, loading, saving, error, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
}
