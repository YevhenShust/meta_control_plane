import { useRef, useCallback, useEffect } from 'react';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '../../components/AppToaster';
import { useUpdateDraftMutation } from '../../store/api';

interface PendingChange {
  content: Record<string, unknown>;
  timestamp: number;
}

interface DebouncedAutosaveParams {
  setupId?: string;
  schemaId?: string;
  debounceMs?: number;
  onRollback?: (rowId: string, originalContent: Record<string, unknown>) => void;
}

/**
 * Hook to manage debounced autosave for table cells
 * Batches changes over a debounce period and saves them with error handling and rollback
 */
export function useDebouncedAutosave({
  setupId,
  schemaId,
  debounceMs = 700,
  onRollback,
}: DebouncedAutosaveParams) {
  const [updateDraft] = useUpdateDraftMutation();
  const pendingChangesRef = useRef<Map<string, PendingChange>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const queueSave = useCallback(
    (rowId: string, content: Record<string, unknown>) => {
      // Mark as pending
      pendingChangesRef.current.set(rowId, { content, timestamp: Date.now() });

      // Clear existing timeout and set new one
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const entries = Array.from(pendingChangesRef.current.entries());
        if (!entries.length) return;
        pendingChangesRef.current.clear();

        for (const [id, { content: draftContent }] of entries) {
          try {
            await updateDraft({
              draftId: id,
              content: draftContent,
              setupId: setupId || '',
              schemaId: schemaId || undefined,
            }).unwrap();
          } catch (e) {
            AppToaster.show({
              message: `Save failed for ${id}: ${e instanceof Error ? e.message : 'Unknown error'}`,
              intent: Intent.DANGER,
              timeout: 3000,
            });
            // Trigger rollback if callback provided
            if (onRollback) {
              onRollback(id, draftContent);
            }
          }
        }
      }, debounceMs);
    },
    [updateDraft, setupId, schemaId, debounceMs, onRollback]
  );

  return { queueSave };
}
