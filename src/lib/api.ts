export type ClientStatus = "Conhecimento" | "Prazo a cumprir" | "Execucao";
type LegacyClientStatus = ClientStatus | "Ativo" | "Aguardando" | "Concluido";
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

type RawClientRecord = Omit<
  ClientRecord,
  "numeroProcesso" | "status" | "arrecadacaoHonorarios" | "dataAudiencia" | "tarefasPendentes" | "observacoes"
> & {
  numeroProcesso?: string | null;
  status: LegacyClientStatus;
  arrecadacaoHonorarios?: number | string | null;
  dataAudiencia?: string | null;
  tarefasPendentes?: string | null;
  observacoes?: string | null;
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

type RawClientListResponse = Omit<ClientListResponse, "data"> & {
  data: RawClientRecord[];
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
      const details = Array.isArray(body.details)
        ? body.details
            .map((detail: { path?: Array<string | number>; message?: string }) =>
              [detail.path?.join("."), detail.message].filter(Boolean).join(": "),
            )
            .filter(Boolean)
            .join("; ")
        : "";
      message = [body.error, details].filter(Boolean).join(" - ") || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) return undefined as ResponseBody;

  return response.json() as Promise<ResponseBody>;
};

const normalizeStatus = (status: LegacyClientStatus): ClientStatus => {
  if (status === "Ativo") return "Conhecimento";
  if (status === "Aguardando") return "Prazo a cumprir";
  if (status === "Concluido") return "Execucao";
  return status;
};

const toLegacyStatus = (status: ClientStatus): "Ativo" | "Aguardando" | "Concluido" => {
  if (status === "Conhecimento") return "Ativo";
  if (status === "Prazo a cumprir") return "Aguardando";
  return "Concluido";
};

const isLegacyStatusError = (error: unknown) =>
  error instanceof Error && error.message.includes("expected one of") && error.message.includes("Ativo");

const normalizeMoney = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeClientRecord = (record: RawClientRecord): ClientRecord => ({
  ...record,
  numeroProcesso: record.numeroProcesso ?? "",
  status: normalizeStatus(record.status),
  honorarios: normalizeMoney(record.honorarios),
  arrecadacaoHonorarios: normalizeMoney(record.arrecadacaoHonorarios),
  dataAudiencia: record.dataAudiencia ?? null,
  tarefasPendentes: record.tarefasPendentes ?? null,
  observacoes: record.observacoes ?? null,
});

const normalizeClientList = (response: RawClientListResponse): ClientListResponse => ({
  ...response,
  data: response.data.map(normalizeClientRecord),
});

const withLegacyStatus = (payload: ClientPayload): ClientPayload & { status: "Ativo" | "Aguardando" | "Concluido" } => ({
  ...payload,
  status: toLegacyStatus(payload.status),
});

export const clientsApi = {
  async list(filters: ClientFilters = {}) {
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "Todos") params.set("status", filters.status);
    if (filters.tipo && filters.tipo !== "Todos") params.set("tipo", filters.tipo);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const query = params.toString();
    try {
      const response = await request<RawClientListResponse>(`/api/clientes${query ? `?${query}` : ""}`);
      return normalizeClientList(response);
    } catch (error) {
      if (!filters.status || filters.status === "Todos" || !isLegacyStatusError(error)) throw error;

      params.set("status", toLegacyStatus(filters.status));
      const legacyQuery = params.toString();
      const response = await request<RawClientListResponse>(`/api/clientes${legacyQuery ? `?${legacyQuery}` : ""}`);
      return normalizeClientList(response);
    }
  },

  async create(payload: ClientPayload) {
    let response: RawClientRecord;
    try {
      response = await request<RawClientRecord>("/api/clientes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (!isLegacyStatusError(error)) throw error;

      response = await request<RawClientRecord>("/api/clientes", {
        method: "POST",
        body: JSON.stringify(withLegacyStatus(payload)),
      });
    }
    return normalizeClientRecord(response);
  },

  async update(id: number, payload: ClientPayload) {
    let response: RawClientRecord;
    try {
      response = await request<RawClientRecord>(`/api/clientes/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (!isLegacyStatusError(error)) throw error;

      response = await request<RawClientRecord>(`/api/clientes/${id}`, {
        method: "PUT",
        body: JSON.stringify(withLegacyStatus(payload)),
      });
    }
    return normalizeClientRecord(response);
  },

  remove(id: number) {
    return request<void>(`/api/clientes/${id}`, {
      method: "DELETE",
    });
  },
};
