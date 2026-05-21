import type {  TaskTemplate  } from '../../types/models';
import { initialTaskTemplates } from "../../data/mock/taskTemplates.mock";

const STORAGE_KEY = 'mcs_task_templates';

const load = (): TaskTemplate[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initialTaskTemplates;
};

const save = (data: TaskTemplate[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const taskTemplateService = {
  list: async (): Promise<TaskTemplate[]> => {
    return load();
  },
  
  getById: async (id: string): Promise<TaskTemplate | undefined> => {
    return load().find(t => t.id === id);
  },

  create: async (data: Omit<TaskTemplate, 'id' | 'active'>): Promise<TaskTemplate> => {
    const list = load();
    const newItem: TaskTemplate = {
      id: crypto.randomUUID(),
      ...data,
      active: true
    };
    list.push(newItem);
    save(list);
    return newItem;
  },

  update: async (id: string, patch: Partial<TaskTemplate>): Promise<void> => {
    const list = load();
    const index = list.findIndex(t => t.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...patch };
      save(list);
    }
  }
};
