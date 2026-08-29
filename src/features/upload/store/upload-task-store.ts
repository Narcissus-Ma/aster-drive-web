import { create } from 'zustand';

import type { UploadTask } from '../models/upload-task';

export interface UploadTaskStore {
  tasks: UploadTask[];
  addTask: (task: UploadTask) => void;
  updateTask: (taskId: string, changes: Partial<UploadTask>) => void;
  removeTask: (taskId: string) => void;
  clearCompleted: () => void;
  reset: () => void;
}

const initialState = { tasks: [] as UploadTask[] };

export const useUploadTaskStore = create<UploadTaskStore>((set) => ({
  ...initialState,
  addTask: (task) =>
    set((state) => ({
      tasks: state.tasks.some((item) => item.id === task.id)
        ? state.tasks
        : [...state.tasks, task],
    })),
  updateTask: (taskId, changes) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...changes } : task,
      ),
    })),
  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId) })),
  clearCompleted: () =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== 'completed'),
    })),
  reset: () => set(initialState),
}));

export const selectUploadTasks = (state: UploadTaskStore): UploadTask[] => state.tasks;
