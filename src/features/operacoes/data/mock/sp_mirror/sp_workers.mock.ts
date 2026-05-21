
import type { SPWorker } from "../../../types/sp_mirror";

export const spWorkersMock: SPWorker[] = [
  {
    id: "uuid-w1",
    sp_id: 2001,
    sp_created: "2022-01-01T00:00:00Z",
    sp_modified: "2023-10-15T10:00:00Z",
    nome: "João da Silva",
    documento: "PT12345678",
    nacionalidade: "Portuguesa",
    categoria_profissional: "Soldador TIG",
    status: "Alocado",
    email: "joao.silva@email.com",
    phone: "+351 91 234 5678"
  },
  {
    id: "uuid-w2",
    sp_id: 2002,
    sp_created: "2022-02-15T00:00:00Z",
    sp_modified: "2023-10-20T11:00:00Z",
    nome: "Manuel Rocha",
    documento: "PT87654321",
    nacionalidade: "Portuguesa",
    categoria_profissional: "Tubista",
    status: "Alocado",
    email: "manuel.rocha@email.com",
    phone: "+351 93 876 5432"
  },
  {
    id: "uuid-w3",
    sp_id: 2003,
    sp_created: "2022-03-10T00:00:00Z",
    sp_modified: "2023-09-01T09:00:00Z",
    nome: "Carlos Mendez",
    documento: "ES99887766",
    nacionalidade: "Espanhola",
    categoria_profissional: "Eletricista",
    status: "Baixa Médica"
  },
  {
    id: "uuid-w4",
    sp_id: 2004,
    sp_created: "2022-05-01T00:00:00Z",
    sp_modified: "2023-10-05T15:00:00Z",
    nome: "Pierre Dubois",
    documento: "FR11223344",
    nacionalidade: "Francesa",
    categoria_profissional: "Serralheiro",
    status: "Disponível",
    email: "pierre.dubois@email.fr",
    phone: "+33 6 12 34 56 78"
  },
  {
    id: "uuid-w5",
    sp_id: 2005,
    sp_created: "2022-06-01T00:00:00Z",
    sp_modified: "2023-10-22T08:00:00Z",
    nome: "António Costa",
    documento: "PT55443322",
    nacionalidade: "Portuguesa",
    categoria_profissional: "Soldador MIG",
    status: "Alocado"
  }
];
