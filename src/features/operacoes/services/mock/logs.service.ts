import type {  IncidenciaLog  } from '../types';

const STORAGE_KEY = 'mcs_incident_logs';

const load = (): IncidenciaLog[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

const save = (data: IncidenciaLog[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const logsService = {
    listByIncident: async (incidentId: string): Promise<IncidenciaLog[]> => {
        const all = load();
        return all
            .filter(l => l.incidencia_id === incidentId)
            .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
    },

    add: async (incidentId: string, message: string, user?: string): Promise<IncidenciaLog> => {
        const list = load();
        const newLog: IncidenciaLog = {
            id: crypto.randomUUID(),
            incidencia_id: incidentId,
            mensagem: message,
            criado_em: new Date().toISOString(),
            usuario: user || 'Sistema'
        };

        list.push(newLog);
        save(list);
        return newLog;
    }
};
