import { create, type StateCreator } from 'zustand';
import { temporal } from 'zundo';
import type { Profile } from '../types/resume';

interface ResumeEditorState {
  profileData: Profile | null;
  setProfileData: (data: Profile | null) => void;
  updateField: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
}

const stateCreator: StateCreator<
  ResumeEditorState,
  [['temporal', unknown]]
> = (set) => ({
  profileData: null,

  setProfileData: (data: Profile | null) => set({ profileData: data }),

  updateField: <K extends keyof Profile>(key: K, value: Profile[K]) =>
    set((state: ResumeEditorState) => ({
      profileData: state.profileData
        ? { ...state.profileData, [key]: value }
        : null,
    })),
});

export const useResumeEditorStore = create<ResumeEditorState>()(
  temporal(stateCreator, {
    limit: 50,
    equality: (pastState: ResumeEditorState, currentState: ResumeEditorState) =>
      JSON.stringify(pastState.profileData) === JSON.stringify(currentState.profileData),
  }),
);

// Keyboard shortcut handler
export function setupUndoRedoShortcuts() {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      const store = useResumeEditorStore as any;
      if (e.shiftKey) {
        store.temporal?.getState()?.redo();
      } else {
        store.temporal?.getState()?.undo();
      }
    }
  };

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
