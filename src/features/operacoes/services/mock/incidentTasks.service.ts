import type {  IncidentTask  } from '../../types/models';
import { initialIncidentTasks } from "../../data/mock/incidentTasks.mock";
import { departmentService } from "./departments.service";
import { notificationService } from "./notifications.service"; // Import notification service

const STORAGE_KEY = 'mcs_incident_tasks';

const load = (): IncidentTask[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initialIncidentTasks;
};

const save = (data: IncidentTask[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const incidentTaskService = {
  listAll: async (): Promise<IncidentTask[]> => {
    return load();
  },

  listByIncident: async (incidentId: string): Promise<IncidentTask[]> => {
    return load().filter(t => t.incident_id === incidentId).sort((a,b) => a.step_order - b.step_order);
  },

  create: async (task: Omit<IncidentTask, 'id' | 'created_at'>): Promise<IncidentTask> => {
      const list = load();
      const newItem: IncidentTask = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...task
      };
      list.push(newItem);
      save(list);

      // TRIGGER: Notification if assigned
      if (newItem.assigned_to) {
          await notificationService.create({
              user_email: newItem.assigned_to,
              type: 'task_assigned',
              title: 'Nova Tarefa',
              message: `A tarefa "${newItem.title}" foi atribuída a você.`,
              entity_type: 'task',
              entity_id: newItem.id,
              severity: 'info'
          });
      }

      return newItem;
  },

  update: async (id: string, patch: Partial<IncidentTask>): Promise<void> => {
      const list = load();
      const idx = list.findIndex(t => t.id === id);
      if (idx !== -1) {
          const currentTask = list[idx];
          const now = new Date().toISOString();
          
          // Automatic Timestamp Logic
          const updates: Partial<IncidentTask> = { ...patch };

          // Status Change logic
          if (patch.status && patch.status !== currentTask.status) {
              updates.last_status_change_at = now;

              // Moving to Doing
              if (patch.status === 'Em Andamento') {
                  if (!currentTask.started_at) {
                      updates.started_at = now;
                  }
              }

              // Moving to Done
              if (patch.status === 'Concluida') {
                  updates.completed_at = now;
                  if (!currentTask.started_at) {
                      updates.started_at = now;
                  }
              }
          }
          
          // TRIGGER: Notification if assigned changes
          if (patch.assigned_to && patch.assigned_to !== currentTask.assigned_to) {
              await notificationService.create({
                  user_email: patch.assigned_to,
                  type: 'task_assigned',
                  title: 'Tarefa Atribuída',
                  message: `A tarefa "${currentTask.title}" foi delegada a você.`,
                  entity_type: 'task',
                  entity_id: currentTask.id,
                  severity: 'info'
              });
          }

          list[idx] = { ...currentTask, ...updates };
          save(list);
      }
  },
  
  // Helpers for UI enrichment
  enrichTask: async (task: IncidentTask) => {
      const depts = await departmentService.list();
      const dept = depts.find(d => d.id === task.department_id);
      return {
          ...task,
          department_name: dept?.name || 'Geral'
      };
  },

  // NEW: Job to check overdue tasks and generate notifications
  checkForOverdueTasks: async (): Promise<void> => {
      const tasks = load();
      const now = new Date();

      for (const task of tasks) {
          if (task.status !== 'Concluida' && task.due_at && task.assigned_to) {
              const dueDate = new Date(task.due_at);
              if (dueDate < now) {
                  // Check duplication
                  const alreadyNotified = await notificationService.exists(task.assigned_to, 'task_overdue', task.id);
                  
                  if (!alreadyNotified) {
                      await notificationService.create({
                          user_email: task.assigned_to,
                          type: 'task_overdue',
                          title: 'Tarefa Vencida',
                          message: `O prazo para "${task.title}" expirou.`,
                          entity_type: 'task',
                          entity_id: task.id,
                          severity: 'danger'
                      });
                  }
              }
          }
      }
  }
};
