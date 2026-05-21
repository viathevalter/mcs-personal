import type { IncidenciaLog } from '../types';

// Fallback in-memory storage for logs until table is created
let memoryLogs: IncidenciaLog[] = [];

export const supabaseLogService = {

    list: async (incidentId: string): Promise<IncidenciaLog[]> => {
        return memoryLogs.filter(l => l.incidencia_id === incidentId).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
    },

    add: async (incidentId: string, message: string, user: string): Promise<IncidenciaLog> => {
        const newLog: IncidenciaLog = {
            id: Math.random().toString(36).substr(2, 9),
            incidencia_id: incidentId,
            mensagem: message,
            usuario: user,
            criado_em: new Date().toISOString()
        };
        memoryLogs.push(newLog);
        return newLog;
    }
};
