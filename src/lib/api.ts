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

type ClientFilters = {
  search?: string;
  status?: ClientStatus | "Todos";
  tipo?: ServiceType | "Todos";
  page?: number;
  limit?: number;
};

const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error("Configure VITE_API_URL com a URL publica da API.");
}

const API_URL = (configuredApiUrl ?? "http://127.0.0.1:3333").replace(/\/$/, "");

const request = async <ResponseBody>(path: string, init?: RequestInit): Promise<ResponseBody> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = "Nao foi possivel concluir a operacao.";

    try {
      const body = await response.json();
      message = body.error ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) return undefined as ResponseBody;

  return response.json() as Promise<ResponseBody>;
};

export const clientsApi = {
  async list(filters: ClientFilters = {}) {
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "Todos") params.set("status", filters.status);
    if (filters.tipo && filters.tipo !== "Todos") params.set("tipo", filters.tipo);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const query = params.toString();
    return request<ClientListResponse>(`/api/clientes${query ? `?${query}` : ""}`);
  },

  create(payload: ClientPayload) {
    return request<ClientRecord>("/api/clientes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: number, payload: ClientPayload) {
    return request<ClientRecord>(`/api/clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(id: number) {
    return request<void>(`/api/clientes/${id}`, {
      method: "DELETE",
    });
  },
};
