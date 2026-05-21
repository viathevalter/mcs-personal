
import type { SPReubicacion } from "../../../types/sp_mirror";

export const spReubicacionesMock: SPReubicacion[] = [
  {
    id: "uuid-rb1",
    sp_id: 8001,
    sp_created: "2023-09-10T11:00:00Z",
    sp_modified: "2023-09-12T15:00:00Z",
    codigo: "RB-10",
    client_sp_id: 10,
    pedido_sp_id: 500,
    worker_sp_id: 2001, // João da Silva
    obra_from_sp_id: 100, // Doca Seca 1
    obra_to_sp_id: 102,   // Manutenção Tubagens (Outro cliente, simulando empréstimo ou erro de cadastro no mock, ou mesma holding)
    data_movimento: "2023-09-15",
    motivo: "Fim de frente de trabalho",
    status: "Concluído"
  },
  {
    id: "uuid-rb2",
    sp_id: 8002,
    sp_created: "2023-10-22T08:30:00Z",
    sp_modified: "2023-10-22T08:30:00Z",
    codigo: "RB-11",
    client_sp_id: 20,
    pedido_sp_id: 501,
    worker_sp_id: 2005, // António Costa
    obra_from_sp_id: 101, 
    obra_to_sp_id: 100,
    data_movimento: "2023-10-25",
    motivo: "Reforço de equipa",
    status: "Planeado"
  }
];
