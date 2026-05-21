
import type { SPPresupuesto } from "../../../types/sp_mirror";

export const spPresupuestosMock: SPPresupuesto[] = [
  {
    id: "uuid-pr1",
    sp_id: 9001,
    sp_created: "2023-10-01T10:00:00Z",
    sp_modified: "2023-10-05T12:00:00Z",
    codigo: "ORC-2023-99",
    client_sp_id: 10,
    titulo: "Reforço Soldadura - Natal",
    valor_total: 45000.00,
    etapa: "Negociação"
  },
  {
    id: "uuid-pr2",
    sp_id: 9002,
    sp_created: "2023-10-10T14:00:00Z",
    sp_modified: "2023-10-11T09:00:00Z",
    codigo: "ORC-2023-100",
    client_sp_id: 30,
    titulo: "Paragem Geral 2024",
    valor_total: 120000.00,
    etapa: "Enviado"
  },
  {
    id: "uuid-pr3",
    sp_id: 9003,
    sp_created: "2023-08-15T09:00:00Z",
    sp_modified: "2023-09-01T10:00:00Z",
    codigo: "ORC-2023-85",
    client_sp_id: 20,
    titulo: "Equipa Extra Eletricidade",
    valor_total: 25000.00,
    etapa: "Ganho"
  }
];
