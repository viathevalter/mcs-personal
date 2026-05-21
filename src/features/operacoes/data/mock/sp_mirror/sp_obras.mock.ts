import type { SPObra } from "../../../types/sp_mirror";

export const spObrasMock: SPObra[] = [
  {
    id: "uuid-o1",
    sp_id: 100,
    sp_created: "2023-01-20T10:00:00Z",
    sp_modified: "2023-01-20T10:00:00Z",
    codigo: "OB-001",
    nome: "Doca Seca 1 - Reparação",
    client_sp_id: 10, // Estaleiro Naval
    localizacao: "Viana do Castelo",
    status: "Em Andamento"
  },
  {
    id: "uuid-o2",
    sp_id: 101,
    sp_created: "2023-03-15T14:00:00Z",
    sp_modified: "2023-03-15T14:00:00Z",
    codigo: "OB-002",
    nome: "Bloco Habitacional Madrid",
    client_sp_id: 20, // Construções Ibéricas
    localizacao: "Madrid, ES",
    status: "Em Andamento"
  },
  {
    id: "uuid-o3",
    sp_id: 102,
    sp_created: "2023-04-01T09:00:00Z",
    sp_modified: "2023-09-10T16:00:00Z",
    codigo: "OB-003",
    nome: "Manutenção Tubagens - Área 4",
    client_sp_id: 30, // Refinaria
    localizacao: "Sines",
    status: "Concluída"
  }
];
