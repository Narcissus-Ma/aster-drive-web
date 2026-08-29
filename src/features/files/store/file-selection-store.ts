import { create } from 'zustand';

export interface FileSelectionState {
  selectedIds: Set<string>;
  clear: () => void;
  setSelectedIds: (ids: Iterable<string>) => void;
  toggle: (resourceId: string) => void;
}

export const useFileSelectionStore = create<FileSelectionState>((set) => ({
  selectedIds: new Set<string>(),
  clear: () => set({ selectedIds: new Set<string>() }),
  setSelectedIds: (ids) => set({ selectedIds: new Set(ids) }),
  toggle: (resourceId) =>
    set((state) => {
      const selectedIds = new Set(state.selectedIds);
      if (selectedIds.has(resourceId)) {
        selectedIds.delete(resourceId);
      } else {
        selectedIds.add(resourceId);
      }
      return { selectedIds };
    }),
}));
