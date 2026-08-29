import { create } from 'zustand';

export type FileViewMode = 'list' | 'grid';

export interface FileViewState {
  viewMode: FileViewMode;
  setViewMode: (viewMode: FileViewMode) => void;
}

export const useFileViewStateStore = create<FileViewState>((set) => ({
  viewMode: 'list',
  setViewMode: (viewMode) => set({ viewMode }),
}));
