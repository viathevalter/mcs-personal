
import type { SPReemplazo } from "../../../types/sp_mirror";

export const spReemplazosMock: SPReemplazo[] = [
  {
    id: "uuid-r1",
    sp_id: 7001,
    sp_created: "2023-10-01T09:00:00Z",
    sp_modified: "2023-10-02T10:00:00Z",
    codigo: "R-195",
    client_sp_id: 10,     // Estaleiro Naval
    pedido_sp_id: 500,    // PED-2023-001
    worker_old_sp_id: 2003, // Carlos Mendez (Baixa Médica)
    worker_new_sp_id: 2004, // Pierre Dubois (Disponível -> Substituto)
    motivo: "Baixa Médica",
    data_solicitacao: "2023-10-01",
    status: "Concluído"
  },
  {
    id: "uuid-r2",
    sp_id: 7002,
    sp_created: "2023-10-20T14:00:00Z",
    sp_modified: "2023-10-21T09:00:00Z",
    codigo: "R-196",
    client_sp_id: 20,     // Construções Ibéricas
    pedido_sp_id: 501,
    worker_old_sp_id: 2002, // Manuel Rocha
    worker_new_sp_id: undefined, // Ainda sem substituto
    motivo: "Desempenho",
    data_solicitacao: "2023-10-20",
    status: "Em Análise"
  }
];
