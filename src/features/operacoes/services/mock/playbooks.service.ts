import type {  Playbook  } from '../../types/models';
import { initialPlaybooks } from "../../data/mock/playbooks.mock";
import { playbookStepService } from "./playbookSteps.service";

const STORAGE_KEY = 'mcs_playbooks';

const load = (): Playbook[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initialPlaybooks;
};

const save = (data: Playbook[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const playbookService = {
  list: async (): Promise<Playbook[]> => {
    return load().sort((a,b) => a.name.localeCompare(b.name));
  },

  listActive: async (): Promise<Playbook[]> => {
    return load().filter(p => p.active);
  },

  save: async (playbook: Partial<Playbook>): Promise<Playbook> => {
    let list = load();
    let savedItem: Playbook;

    if (playbook.id) {
        list = list.map(p => p.id === playbook.id ? { ...p, ...playbook } as Playbook : p);
        savedItem = list.find(p => p.id === playbook.id)!;
    } else {
        savedItem = {
            id: crypto.randomUUID(),
            name: playbook.name || 'Novo Playbook',
            incident_type: playbook.incident_type || 'Geral',
            description: playbook.description || '',
            active: playbook.active ?? true,
            version: 1
        };
        list.push(savedItem);
    }
    save(list);
    return savedItem;
  },

  // NEW: Create next version
  createNextVersion: async (currentPlaybookId: string): Promise<Playbook> => {
      const list = load();
      const current = list.find(p => p.id === currentPlaybookId);
      
      if (!current) throw new Error("Playbook not found");

      // 1. Deactivate old
      current.active = false;
      
      // 2. Create new version
      const newVersion: Playbook = {
          ...current,
          id: crypto.randomUUID(),
          version: (current.version || 1) + 1,
          active: true // New version becomes the active one
      };
      
      list.push(newVersion);
      save(list); // Saves the deactivation of old and creation of new

      // 3. Clone steps
      await playbookStepService.cloneSteps(currentPlaybookId, newVersion.id);

      return newVersion;
  }
};
