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
  numeroProcesso: string;
  tipo: ServiceType;
  status: ClientStatus;
  honorarios: number;
  arrecadacaoHonorarios: number;
  dataAbertura: string;
  dataAudiencia: string;
  responsavelNome: string;
  proximoPasso: string;
  tarefasPendentes: string;
  observacoes: string;
};

type ViewMode = "clientes" | "processos" | "audiencias";

type ClientGroup = {
  clienteId: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  processos: ClientRecord[];
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: ClientForm = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  numeroProcesso: "",
  tipo: "Consultoria",
  status: "Conhecimento",
  honorarios: 0,
  arrecadacaoHonorarios: 0,
  dataAbertura: today,
  dataAudiencia: "",
  responsavelNome: "",
  proximoPasso: "",
  tarefasPendentes: "",
  observacoes: "",
};

const statusStyles: Record<ClientStatus, string> = {
  Conhecimento: "bg-sky-50 text-sky-700 border-sky-200",
  "Prazo a cumprir": "bg-amber-50 text-amber-700 border-amber-200",
  Execucao: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

const toDateInput = (date?: string | null) => (date ? date.slice(0, 10) : "");
const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatDate = (date?: string | null) => {
  if (!date) return "Sem data";
  return dateFormatter.format(new Date(`${toDateInput(date)}T12:00:00`));
};

const formatCpfCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

const safeText = (value: string | null | undefined) => value ?? "";

const toPayload = (form: ClientForm): ClientPayload => ({
  nome: safeText(form.nome).trim(),
  cpf: formatCpfCnpj(safeText(form.cpf)),
  telefone: formatPhone(safeText(form.telefone)),
  email: safeText(form.email).trim(),
  numeroProcesso: safeText(form.numeroProcesso).trim(),
  tipo: form.tipo,
  status: form.status,
  honorarios: Number(form.honorarios),
  arrecadacaoHonorarios: Number(form.arrecadacaoHonorarios),
  dataAbertura: form.dataAbertura,
  dataAudiencia: form.dataAudiencia || null,
  responsavelNome: safeText(form.responsavelNome).trim(),
  proximoPasso: safeText(form.proximoPasso).trim(),
  tarefasPendentes: safeText(form.tarefasPendentes).trim() || null,
  observacoes: safeText(form.observacoes).trim() || null,
});

const serviceOptions: ServiceType[] = ["Consultoria", "Processo", "Contrato", "Audiencia", "Planejamento"];
const statusOptions: ClientStatus[] = ["Conhecimento", "Prazo a cumprir", "Execucao"];
const pageSize = 4;

const Index = () => {
  const [records, setRecords] = useState<ClientRecord[]>([]);
  const [allRecords, setAllRecords] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "Todos">("Todos");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "Todos">("Todos");
  const [viewMode, setViewMode] = useState<ViewMode>("clientes");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveServiceFilter = viewMode === "audiencias" ? "Audiencia" : serviceFilter;

  const loadRecords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [listResponse, metricsResponse] = await Promise.all([
        clientsApi.list({
          search: query.trim() || undefined,
          status: statusFilter,
          tipo: viewMode === "clientes" ? serviceFilter : effectiveServiceFilter,
          page,
          limit: pageSize,
        }),
        clientsApi.list({ limit: 100 }),
      ]);

      setRecords(listResponse.data);
      setAllRecords(metricsResponse.data);
      setTotalRecords(listResponse.pagination.total);
      setTotalPages(listResponse.pagination.totalPages);

      const first = listResponse.data[0] ?? null;
      if (first && !listResponse.data.some((record) => record.clienteId === selectedClientId)) {
        setSelectedClientId(first.clienteId);
        setSelectedProcessId(first.id);
      }
      if (!first) {
        setSelectedClientId(null);
        setSelectedProcessId(null);
      }
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao carregar registros.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, serviceFilter, viewMode, page]);

  const clientGroups = useMemo(() => groupClients(allRecords), [allRecords]);
  const visibleClientGroups = useMemo(() => groupClients(records), [records]);

  const selectedClientGroup = useMemo(
    () => clientGroups.find((client) => client.clienteId === selectedClientId) ?? visibleClientGroups[0] ?? null,
    [clientGroups, selectedClientId, visibleClientGroups],
  );

  const selectedProcess =
    selectedClientGroup?.processos.find((processo) => processo.id === selectedProcessId) ?? selectedClientGroup?.processos[0] ?? null;

  const metrics = useMemo(() => {
    const totalClientes = new Set(allRecords.map((record) => record.clienteId)).size;
    const processCount = allRecords.filter((record) => record.tipo === "Processo").length;
    const hearings = allRecords.filter((record) => record.tipo === "Audiencia").length;
    const collected = allRecords.reduce((total, record) => total + record.arrecadacaoHonorarios, 0);

    return [
      { label: "Clientes", value: totalClientes.toString(), icon: UserRound },
      { label: "Processos", value: processCount.toString(), icon: BriefcaseBusiness },
      { label: "Audiencias", value: hearings.toString(), icon: CalendarDays },
      { label: "Arrecadacao", value: currencyFormatter.format(collected), icon: CircleDollarSign },
    ];
  }, [allRecords]);

  const openCreateForm = (type: ServiceType = "Consultoria", client?: ClientGroup | null) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      tipo: type,
      nome: client?.nome ?? "",
      cpf: client?.cpf ?? "",
      telefone: client?.telefone ?? "",
      email: client?.email ?? "",
    });
    setIsFormOpen(true);
  };

  const openEditForm = (client: ClientRecord) => {
    setEditingId(client.id);
    setForm({
      nome: client.nome,
      cpf: client.cpf,
      telefone: client.telefone,
      email: client.email,
      numeroProcesso: safeText(client.numeroProcesso),
      tipo: client.tipo,
      status: client.status,
      honorarios: Number.isFinite(Number(client.honorarios)) ? Number(client.honorarios) : 0,
      arrecadacaoHonorarios: Number.isFinite(Number(client.arrecadacaoHonorarios)) ? Number(client.arrecadacaoHonorarios) : 0,
      dataAbertura: toDateInput(client.dataAbertura),
      dataAudiencia: toDateInput(client.dataAudiencia),
      responsavelNome: safeText(client.responsavelNome),
      proximoPasso: safeText(client.proximoPasso),
      tarefasPendentes: safeText(client.tarefasPendentes),
      observacoes: safeText(client.observacoes),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const savedRecord = editingId ? await clientsApi.update(editingId, toPayload(form)) : await clientsApi.create(toPayload(form));

      setSelectedClientId(savedRecord.clienteId);
      setSelectedProcessId(savedRecord.id);
      setIsFormOpen(false);
      setEditingId(null);
      setPage(1);
      await loadRecords();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao salvar registro.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeProcess = async (processId: number) => {
    const shouldDelete = window.confirm("Deseja excluir este registro?");
    if (!shouldDelete) return;

    setError(null);

    try {
      await clientsApi.remove(processId);
      setSelectedProcessId(null);
      await loadRecords();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao excluir registro.");
    }
  };

  const updateField = <Key extends keyof ClientForm>(key: Key, value: ClientForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
    if (mode === "audiencias") setServiceFilter("Todos");
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
            <Button variant="outline" onClick={loadRecords} className="h-11 rounded-full px-5" disabled={isLoading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button onClick={() => openCreateForm()} className="h-11 rounded-full px-5">
              <Plus className="mr-2 h-4 w-4" />
              Novo cadastro
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
                  <p className="mt-3 font-serif text-2xl text-primary">{isLoading && allRecords.length === 0 ? "..." : value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]">
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <TabButton active={viewMode === "clientes"} onClick={() => changeView("clientes")}>
                  Clientes
                </TabButton>
                <TabButton active={viewMode === "processos"} onClick={() => changeView("processos")}>
                  Processos
                </TabButton>
                <TabButton active={viewMode === "audiencias"} onClick={() => changeView("audiencias")}>
                  Audiencias
                </TabButton>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Pesquisar por cliente, CPF/CNPJ, telefone, processo ou responsavel"
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
                    value={viewMode === "audiencias" ? "Audiencia" : serviceFilter}
                    disabled={viewMode === "audiencias"}
                    onChange={(event) => {
                      setServiceFilter(event.target.value as ServiceType | "Todos");
                      setPage(1);
                    }}
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm disabled:bg-muted"
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
              {isLoading && records.length === 0 && (
                <div className="flex items-center justify-center rounded-lg border border-border bg-background p-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando registros...
                </div>
              )}

              {!isLoading &&
                viewMode === "clientes" &&
                visibleClientGroups.map((client) => (
                  <button
                    key={client.clienteId}
                    onClick={() => {
                      setSelectedClientId(client.clienteId);
                      setSelectedProcessId(client.processos[0]?.id ?? null);
                    }}
                    className={`rounded-lg border bg-background p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] ${
                      selectedClientGroup?.clienteId === client.clienteId ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h2 className="break-words text-xl text-primary">{client.nome}</h2>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            {client.cpf}
                          </span>
                          <span className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            {client.telefone}
                          </span>
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            {client.email}
                          </span>
                          <span className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-primary" />
                            {client.processos.length} registro(s)
                          </span>
                        </div>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Arrecadado</p>
                        <p className="mt-1 font-serif text-xl text-primary">
                          {currencyFormatter.format(client.processos.reduce((total, processo) => total + processo.arrecadacaoHonorarios, 0))}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

              {!isLoading &&
                viewMode !== "clientes" &&
                records.map((record) => (
                  <ProcessCard
                    key={record.id}
                    record={record}
                    selected={selectedProcess?.id === record.id}
                    onClick={() => {
                      setSelectedClientId(record.clienteId);
                      setSelectedProcessId(record.id);
                    }}
                  />
                ))}

              {!isLoading && records.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-background p-10 text-center">
                  <p className="font-serif text-xl text-primary">Nenhum registro encontrado</p>
                  <p className="mt-2 text-sm text-muted-foreground">Ajuste a busca ou limpe os filtros aplicados.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {records.length} de {totalRecords} registros
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

          {selectedClientGroup && (
            <aside className="rounded-lg border border-border bg-background p-6 shadow-[var(--shadow-card)] xl:sticky xl:top-6 xl:self-start">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gold">Pagina do cliente</p>
                  <h2 className="mt-2 break-words text-2xl text-primary">{selectedClientGroup.nome}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Cliente #{selectedClientGroup.clienteId}</p>
                </div>
                <Button size="sm" className="rounded-full" onClick={() => openCreateForm("Processo", selectedClientGroup)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Processo
                </Button>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                {[
                  ["CPF/CNPJ", selectedClientGroup.cpf],
                  ["Telefone", selectedClientGroup.telefone],
                  ["Email", selectedClientGroup.email],
                ].map(([label, value]) => (
                  <DetailRow key={label} label={label} value={value} />
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="text-base text-primary">Processos e servicos do cliente</h3>
                {selectedClientGroup.processos.map((processo) => (
                  <button
                    key={processo.id}
                    onClick={() => setSelectedProcessId(processo.id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      selectedProcess?.id === processo.id ? "border-primary bg-secondary" : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">{processo.tipo}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${statusStyles[processo.status]}`}>{processo.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {processo.numeroProcesso || `Registro #${processo.id}`} - {formatDate(processo.dataAbertura)}
                    </p>
                  </button>
                ))}
              </div>

              {selectedProcess && (
                <>
                  <div className="mt-6 rounded-lg bg-secondary p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="h-4 w-4" />
                      <h3 className="text-base">Detalhes do processo</h3>
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      <DetailRow label="Numero" value={selectedProcess.numeroProcesso || "Nao informado"} />
                      <DetailRow label="Responsavel" value={selectedProcess.responsavelNome} />
                      <DetailRow label="Abertura" value={formatDate(selectedProcess.dataAbertura)} />
                      <DetailRow label="Audiencia" value={selectedProcess.dataAudiencia ? formatDate(selectedProcess.dataAudiencia) : "Nao agendada"} />
                      <DetailRow label="Honorarios" value={currencyFormatter.format(selectedProcess.honorarios)} />
                      <DetailRow label="Arrecadacao" value={currencyFormatter.format(selectedProcess.arrecadacaoHonorarios)} />
                    </div>
                  </div>

                  <InfoBlock title="Proximo passo" value={selectedProcess.proximoPasso} />
                  <InfoBlock title="Tarefas pendentes" value={selectedProcess.tarefasPendentes || "Sem tarefas pendentes."} />
                  <InfoBlock title="Observacoes" value={selectedProcess.observacoes || "Sem observacoes."} />

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-full" onClick={() => openEditForm(selectedProcess)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeProcess(selectedProcess.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </>
              )}
            </aside>
          )}
        </section>
      </main>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background p-6 shadow-[var(--shadow-elegant)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gold">{editingId ? "Editar registro" : "Novo cadastro"}</p>
                <h2 className="mt-2 text-2xl text-primary">{editingId ? "Atualizar processo/servico" : "Cadastrar cliente ou processo"}</h2>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsFormOpen(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome completo / razao social">
                  <Input required value={form.nome} onChange={(event) => updateField("nome", event.target.value)} />
                </Field>
                <Field label="CPF/CNPJ">
                  <Input required value={form.cpf} onChange={(event) => updateField("cpf", formatCpfCnpj(event.target.value))} />
                </Field>
                <Field label="Telefone">
                  <Input required value={form.telefone} onChange={(event) => updateField("telefone", formatPhone(event.target.value))} />
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
                <Field label="Status do processo">
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
                <Field label="Numero do processo">
                  <Input value={form.numeroProcesso} onChange={(event) => updateField("numeroProcesso", event.target.value)} />
                </Field>
                <Field label="Data de audiencia">
                  <Input type="date" value={form.dataAudiencia} onChange={(event) => updateField("dataAudiencia", event.target.value)} />
                </Field>
                <Field label="Honorarios contratados">
                  <Input
                    required
                    min="0"
                    type="number"
                    value={form.honorarios}
                    onChange={(event) => updateField("honorarios", Number(event.target.value))}
                  />
                </Field>
                <Field label="Arrecadacao de honorarios">
                  <Input
                    required
                    min="0"
                    type="number"
                    value={form.arrecadacaoHonorarios}
                    onChange={(event) => updateField("arrecadacaoHonorarios", Number(event.target.value))}
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
              <Field label="Tarefas pendentes">
                <Textarea rows={3} value={form.tarefasPendentes} onChange={(event) => updateField("tarefasPendentes", event.target.value)} />
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

const groupClients = (records: ClientRecord[]): ClientGroup[] => {
  const groups = new Map<number, ClientGroup>();
  records.forEach((record) => {
    const current = groups.get(record.clienteId);
    if (current) {
      current.processos.push(record);
      return;
    }

    groups.set(record.clienteId, {
      clienteId: record.clienteId,
      nome: record.nome,
      cpf: record.cpf,
      telefone: record.telefone,
      email: record.email,
      processos: [record],
    });
  });

  return Array.from(groups.values());
};

type ProcessCardProps = {
  record: ClientRecord;
  selected: boolean;
  onClick: () => void;
};

const ProcessCard = ({ record, selected, onClick }: ProcessCardProps) => (
  <button
    onClick={onClick}
    className={`rounded-lg border bg-background p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] ${
      selected ? "border-primary" : "border-border"
    }`}
  >
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="break-words text-xl text-primary">{record.nome}</h2>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[record.status]}`}>{record.status}</span>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            {record.tipo}
          </span>
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {record.numeroProcesso || "Sem numero"}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {record.tipo === "Audiencia" ? formatDate(record.dataAudiencia) : formatDate(record.dataAbertura)}
          </span>
          <span className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            {record.telefone}
          </span>
        </div>
      </div>
      <div className="text-left lg:text-right">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Arrecadacao</p>
        <p className="mt-1 font-serif text-xl text-primary">{currencyFormatter.format(record.arrecadacaoHonorarios)}</p>
      </div>
    </div>
  </button>
);

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

type DetailRowProps = {
  label: string;
  value: ReactNode;
};

const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="break-words text-right font-medium text-foreground">{value}</span>
  </div>
);

type InfoBlockProps = {
  title: string;
  value: string;
};

const InfoBlock = ({ title, value }: InfoBlockProps) => (
  <div className="mt-4 rounded-lg border border-border p-4">
    <h3 className="text-base text-primary">{title}</h3>
    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{value}</p>
  </div>
);

type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

const TabButton = ({ active, onClick, children }: TabButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-10 rounded-lg border px-4 text-sm font-medium transition ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-secondary"
    }`}
  >
    {children}
  </button>
);

export default Index;
