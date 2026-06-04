export type ClientStatus = "Conhecimento" | "Prazo a cumprir" | "Execucao";
export type ServiceType = "Consultoria" | "Processo" | "Contrato" | "Audiencia" | "Planejamento";

export type ClientRecord = {
  id: number;
  clienteId: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  numeroProcesso: string;
  tipo: ServiceType;
  status: ClientStatus;
  honorarios: number;
  arrecadacaoHonorarios: number;
  dataAbertura: string;
  dataAudiencia: string | null;
  responsavelNome: string;
  proximoPasso: string;
  tarefasPendentes: string | null;
  observacoes: string | null;
};

export type ClientPayload = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  numeroProcesso: string;
  tipo: ServiceType;
  status: ClientStatus;
  honorarios: number;
  arrecadacaoHonorarios: number;
  dataAbertura: string;
  dataAudiencia: string | null;
  responsavelNome: string;
  proximoPasso: string;
  tarefasPendentes: string | null;
  observacoes: string | null;
};

export type ClientListResponse = {
  data: ClientRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ClientFilters = {
  search?: string;
  status?: ClientStatus | "Todos";
  tipo?: ServiceType | "Todos";
  page?: number;
  limit?: number;
};

const getLocalDb = () => {
  if (!window.crmDb) {
    throw new Error("Banco local indisponivel. Abra o sistema pelo aplicativo desktop.");
  }

  return window.crmDb;
};

export const clientsApi = {
  list(filters: ClientFilters = {}) {
    return getLocalDb().listClientes(filters);
  },

  create(payload: ClientPayload) {
    return getLocalDb().createCliente(payload);
  },

  update(id: number, payload: ClientPayload) {
    return getLocalDb().updateCliente(id, payload);
  },

  remove(id: number) {
    return getLocalDb().deleteCliente(id).then(() => undefined);
  },
};
