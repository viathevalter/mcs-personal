import type {  Department  } from '../../types/models';
import { initialDepartments } from "../../data/mock/departments.mock";

const STORAGE_KEY = 'mcs_departments';

const load = (): Department[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initialDepartments;
};

const save = (data: Department[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const departmentService = {
  list: async (): Promise<Department[]> => {
    return load();
  },
  
  getById: async (id: string): Promise<Department | undefined> => {
    return load().find(d => d.id === id);
  },

  create: async (name: string): Promise<Department> => {
    const list = load();
    const newItem: Department = {
      id: crypto.randomUUID(),
      name,
      active: true
    };
    list.push(newItem);
    save(list);
    return newItem;
  }
};
