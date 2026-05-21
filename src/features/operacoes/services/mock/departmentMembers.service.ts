import type {  DepartmentMember  } from '../../types/models';
import { initialDepartmentMembers } from "../../data/mock/departmentMembers.mock";

const STORAGE_KEY = 'mcs_department_members';

const load = (): DepartmentMember[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initialDepartmentMembers;
};

// Read-only logic for now as we don't have a screen to edit members
export const departmentMemberService = {
  listByDepartment: async (deptId: string): Promise<DepartmentMember[]> => {
    return load().filter(m => m.department_id === deptId && m.active);
  },

  getLeader: async (deptId: string): Promise<DepartmentMember | undefined> => {
      return load().find(m => m.department_id === deptId && m.role === 'leader' && m.active);
  }
};
