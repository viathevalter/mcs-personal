import type { SPPedido } from "../../../types/sp_mirror";

export const spPedidosMock: SPPedido[] = [
  {
    id: "uuid-p1",
    sp_id: 500,
    sp_created: "2023-01-25T10:00:00Z",
    sp_modified: "2023-02-01T10:00:00Z",
    codigo: "PED-2023-001",
    client_sp_id: 10,
    obra_sp_id: 100,
    data_inicio: "2023-02-15",
    status: "Em Execução",
    comercial_email: "ana.silva@mastercorp.local"
  },
  {
    id: "uuid-p2",
    sp_id: 501,
    sp_created: "2023-03-20T11:00:00Z",
    sp_modified: "2023-03-25T11:00:00Z",
    codigo: "PED-2023-055",
    client_sp_id: 20,
    obra_sp_id: 101,
    data_inicio: "2023-04-01",
    status: "Em Execução",
    comercial_email: "carlos.mendes@mastercorp.local"
  },
  {
    id: "uuid-p3",
    sp_id: 502,
    sp_created: "2023-09-01T14:00:00Z",
    sp_modified: "2023-09-05T14:00:00Z",
    codigo: "PED-2023-102",
    client_sp_id: 30,
    obra_sp_id: 102,
    data_inicio: "2023-09-15",
    status: "Fechado",
    comercial_email: "ana.silva@mastercorp.local"
  }
];
