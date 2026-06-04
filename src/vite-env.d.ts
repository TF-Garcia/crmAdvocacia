/// <reference types="vite/client" />

import type { ClientFilters, ClientListResponse, ClientPayload, ClientRecord } from "./lib/api";

declare global {
  interface Window {
    crmDb?: {
      listClientes(filters?: ClientFilters): Promise<ClientListResponse>;
      findCliente(id: number): Promise<ClientRecord | null>;
      createCliente(payload: ClientPayload): Promise<ClientRecord>;
      updateCliente(id: number, payload: ClientPayload): Promise<ClientRecord | null>;
      deleteCliente(id: number): Promise<boolean>;
    };
  }
}
