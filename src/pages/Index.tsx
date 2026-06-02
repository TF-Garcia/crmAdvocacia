import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  FileText,
  Filter,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCcw,
  Scale,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClientPayload, ClientRecord, ClientStatus, clientsApi, ServiceType } from "@/lib/api";
import logo from "@/assets/logo.webp";

type ClientForm = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  tipo: ServiceType;
  status: ClientStatus;
  honorarios: number;
  dataAbertura: string;
  responsavelNome: string;
  proximoPasso: string;
  observacoes: string;
};

const emptyForm: ClientForm = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  tipo: "Consultoria",
  status: "Ativo",
  honorarios: 0,
  dataAbertura: new Date().toISOString().slice(0, 10),
  responsavelNome: "",
  proximoPasso: "",
  observacoes: "",
};

const statusStyles: Record<ClientStatus, string> = {
  Ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Aguardando: "bg-amber-50 text-amber-700 border-amber-200",
  Concluido: "bg-slate-100 text-slate-700 border-slate-200",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const toDateInput = (date: string) => date.slice(0, 10);

const formatDate = (date: string) => dateFormatter.format(new Date(`${toDateInput(date)}T12:00:00`));

const toPayload = (form: ClientForm): ClientPayload => ({
  nome: form.nome,
  cpf: form.cpf,
  telefone: form.telefone,
  email: form.email,
  tipo: form.tipo,
  status: form.status,
  honorarios: Number(form.honorarios),
  dataAbertura: form.dataAbertura,
  responsavelNome: form.responsavelNome,
  proximoPasso: form.proximoPasso,
  observacoes: form.observacoes.trim() ? form.observacoes : null,
});

const serviceOptions: ServiceType[] = ["Consultoria", "Processo", "Contrato", "Audiencia", "Planejamento"];
const statusOptions: ClientStatus[] = ["Ativo", "Aguardando", "Concluido"];
const pageSize = 4;

const Index = () => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [allClients, setAllClients] = useState<ClientRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "Todos">("Todos");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "Todos">("Todos");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find((client) => client.id === selectedId) ?? clients[0] ?? null;

  const loadClients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [listResponse, metricsResponse] = await Promise.all([
        clientsApi.list({
          search: query.trim() || undefined,
          status: statusFilter,
          tipo: serviceFilter,
          page,
          limit: pageSize,
        }),
        clientsApi.list({ limit: 100 }),
      ]);

      setClients(listResponse.data);
      setAllClients(metricsResponse.data);
      setTotalRecords(listResponse.pagination.total);
      setTotalPages(listResponse.pagination.totalPages);

      if (listResponse.data.length > 0 && !listResponse.data.some((client) => client.id === selectedId)) {
        setSelectedId(listResponse.data[0].id);
      }

      if (listResponse.data.length === 0) {
        setSelectedId(null);
      }
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao carregar clientes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, serviceFilter, page]);

  const metrics = useMemo(() => {
    const openCases = allClients.filter((client) => client.status !== "Concluido").length;
    const activeValue = allClients
      .filter((client) => client.status !== "Concluido")
      .reduce((total, client) => total + client.honorarios, 0);
    const waiting = allClients.filter((client) => client.status === "Aguardando").length;

    return [
      { label: "Clientes", value: allClients.length.toString(), icon: UserRound },
      { label: "Casos abertos", value: openCases.toString(), icon: BriefcaseBusiness },
      { label: "Aguardando", value: waiting.toString(), icon: CalendarDays },
      { label: "Honorarios ativos", value: currencyFormatter.format(activeValue), icon: CircleDollarSign },
    ];
  }, [allClients]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (client: ClientRecord) => {
    setEditingId(client.id);
    setForm({
      nome: client.nome,
      cpf: client.cpf,
      telefone: client.telefone,
      email: client.email,
      tipo: client.tipo,
      status: client.status,
      honorarios: client.honorarios,
      dataAbertura: toDateInput(client.dataAbertura),
      responsavelNome: client.responsavelNome,
      proximoPasso: client.proximoPasso,
      observacoes: client.observacoes ?? "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const savedClient = editingId
        ? await clientsApi.update(editingId, toPayload(form))
        : await clientsApi.create(toPayload(form));

      setSelectedId(savedClient.id);
      setIsFormOpen(false);
      setEditingId(null);
      setPage(1);
      await loadClients();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao salvar registro.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeClient = async (clientId: number) => {
    const shouldDelete = window.confirm("Deseja excluir este registro?");
    if (!shouldDelete) return;

    setError(null);

    try {
      await clientsApi.remove(clientId);
      setSelectedId(null);
      await loadClients();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao excluir registro.");
    }
  };

  const updateField = <Key extends keyof ClientForm>(key: Key, value: ClientForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-secondary text-foreground">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex min-h-20 flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logotipo do escritorio" className="h-12 w-auto" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gold">Advocacia & Consultoria</p>
              <h1 className="text-2xl text-primary sm:text-3xl">Gestao de Clientes</h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={loadClients} className="h-11 rounded-full px-5" disabled={isLoading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button onClick={openCreateForm} className="h-11 rounded-full px-5">
              <Plus className="mr-2 h-4 w-4" />
              Novo cliente
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 lg:py-10">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border bg-background p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-3 font-serif text-2xl text-primary">{isLoading && allClients.length === 0 ? "..." : value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Pesquisar por nome, CPF, telefone, servico ou responsavel"
                    className="h-11 rounded-lg pl-10"
                  />
                </label>
                <label className="relative block">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as ClientStatus | "Todos");
                      setPage(1);
                    }}
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm"
                  >
                    <option>Todos</option>
                    {statusOptions.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="relative block">
                  <ClipboardList className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={serviceFilter}
                    onChange={(event) => {
                      setServiceFilter(event.target.value as ServiceType | "Todos");
                      setPage(1);
                    }}
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm"
                  >
                    <option>Todos</option>
                    {serviceOptions.map((service) => (
                      <option key={service}>{service}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid gap-3">
              {isLoading && clients.length === 0 && (
                <div className="flex items-center justify-center rounded-lg border border-border bg-background p-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando clientes...
                </div>
              )}

              {!isLoading &&
                clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedId(client.id)}
                    className={`rounded-lg border bg-background p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] ${
                      selectedClient?.id === client.id ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl text-primary">{client.nome}</h2>
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[client.status]}`}>
                            {client.status}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <span className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-primary" />
                            {client.tipo}
                          </span>
                          <span className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            {formatDate(client.dataAbertura)}
                          </span>
                          <span className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            {client.telefone}
                          </span>
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            {client.email}
                          </span>
                        </div>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Honorarios</p>
                        <p className="mt-1 font-serif text-xl text-primary">{currencyFormatter.format(client.honorarios)}</p>
                      </div>
                    </div>
                  </button>
                ))}

              {!isLoading && clients.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-background p-10 text-center">
                  <p className="font-serif text-xl text-primary">Nenhum cliente encontrado</p>
                  <p className="mt-2 text-sm text-muted-foreground">Ajuste a busca ou limpe os filtros aplicados.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {clients.length} de {totalRecords} registros
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || isLoading}
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-16 text-center text-sm font-medium text-primary">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages || isLoading}
                  aria-label="Proxima pagina"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {selectedClient && (
            <aside className="rounded-lg border border-border bg-background p-6 shadow-[var(--shadow-card)] xl:sticky xl:top-6 xl:self-start">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gold">Detalhes do cliente</p>
                  <h2 className="mt-2 text-2xl text-primary">{selectedClient.nome}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Registro #{selectedClient.id}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[selectedClient.status]}`}>
                  {selectedClient.status}
                </span>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                {[
                  ["CPF", selectedClient.cpf],
                  ["Telefone", selectedClient.telefone],
                  ["Email", selectedClient.email],
                  ["Responsavel", selectedClient.responsavelNome],
                  ["Servico", selectedClient.tipo],
                  ["Abertura", formatDate(selectedClient.dataAbertura)],
                  ["Honorarios", currencyFormatter.format(selectedClient.honorarios)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-border pb-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg bg-secondary p-4">
                <div className="flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  <h3 className="text-base">Proximo passo</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedClient.proximoPasso}</p>
              </div>

              <div className="mt-4 rounded-lg border border-border p-4">
                <h3 className="text-base text-primary">Observacoes</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedClient.observacoes || "Sem observacoes."}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" className="rounded-full" onClick={() => openEditForm(selectedClient)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeClient(selectedClient.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </aside>
          )}
        </section>
      </main>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background p-6 shadow-[var(--shadow-elegant)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gold">{editingId ? "Editar registro" : "Novo registro"}</p>
                <h2 className="mt-2 text-2xl text-primary">{editingId ? "Atualizar cliente" : "Cadastrar cliente"}</h2>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsFormOpen(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome completo">
                  <Input required value={form.nome} onChange={(event) => updateField("nome", event.target.value)} />
                </Field>
                <Field label="CPF">
                  <Input required value={form.cpf} onChange={(event) => updateField("cpf", event.target.value)} />
                </Field>
                <Field label="Telefone">
                  <Input required value={form.telefone} onChange={(event) => updateField("telefone", event.target.value)} />
                </Field>
                <Field label="Email">
                  <Input required type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                </Field>
                <Field label="Servico">
                  <select
                    value={form.tipo}
                    onChange={(event) => updateField("tipo", event.target.value as ServiceType)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {serviceOptions.map((service) => (
                      <option key={service}>{service}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(event) => updateField("status", event.target.value as ClientStatus)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {statusOptions.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Honorarios">
                  <Input
                    required
                    min="0"
                    type="number"
                    value={form.honorarios}
                    onChange={(event) => updateField("honorarios", Number(event.target.value))}
                  />
                </Field>
                <Field label="Data de abertura">
                  <Input required type="date" value={form.dataAbertura} onChange={(event) => updateField("dataAbertura", event.target.value)} />
                </Field>
                <Field label="Responsavel">
                  <Input required value={form.responsavelNome} onChange={(event) => updateField("responsavelNome", event.target.value)} />
                </Field>
              </div>

              <Field label="Proximo passo">
                <Textarea required rows={3} value={form.proximoPasso} onChange={(event) => updateField("proximoPasso", event.target.value)} />
              </Field>
              <Field label="Observacoes">
                <Textarea rows={4} value={form.observacoes} onChange={(event) => updateField("observacoes", event.target.value)} />
              </Field>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Salvar registro
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

type FieldProps = {
  label: string;
  children: ReactNode;
};

const Field = ({ label, children }: FieldProps) => (
  <label className="grid gap-2 text-sm font-medium text-foreground">
    <span>{label}</span>
    {children}
  </label>
);

export default Index;
