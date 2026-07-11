"use client";
import { Suspense, useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, UserPlus, Phone, Mail, ArrowUpRight, Filter, X, Check, Shield, Pencil, Trash2 } from "lucide-react";
import { cn, formatDate, formatCurrency, PROFILE_COLORS, PROFILE_LABELS } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";

const PROFILES = ["", "NEW", "RECURRING", "HIGH_VALUE", "INACTIVE", "PENDING_RETURN", "AT_RISK"] as const;

const EMPTY_FORM = {
  id: "" as string,
  name: "",
  cpf: "",
  phone: "",
  email: "",
  birthDate: "",
  origin: "",
  notes: "",
  selectedPlanIds: [] as string[],
};

export default function PacientesPage() {
  return (
    <Suspense fallback={null}>
      <PacientesPageInner />
    </Suspense>
  );
}

function PacientesPageInner() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [profile, setProfile] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  // Debounce 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (profile) params.set("profile", profile);

  const { data, isLoading, mutate } = useSWR(`/api/patients?${params}`, fetcher);
  const patients: any[] = data?.data ?? [];
  const totalPatients: number = data?.total ?? 0;

  // Convênios: só busca quando o modal abre
  const { data: plansData } = useSWR(showModal ? "/api/convenios" : null, fetcher);
  const plans: any[] = Array.isArray(plansData) ? plansData.filter((p: any) => p.active) : [];

  // Quando estiver editando, casa os nomes de convênio do paciente com os IDs reais assim que a lista chega.
  useEffect(() => {
    if (!showModal || !form.id) return;
    const wanted: string[] = (form as any).__insuranceNames ?? [];
    if (wanted.length === 0 || plans.length === 0) return;
    const ids = plans.filter((p) => wanted.includes(p.name)).map((p) => p.id);
    if (ids.length && JSON.stringify(ids) !== JSON.stringify(form.selectedPlanIds)) {
      setForm((f: any) => ({ ...f, selectedPlanIds: ids }));
    }
  }, [showModal, form.id, plans.length]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setSaveError(null);
    setShowModal(true);
  }

  function openEdit(p: any) {
    // Pré-seleciona planos pelo nome (Patient.insurance é string concatenada)
    const insuranceNames = String(p.insurance ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setForm({
      id: p.id,
      name: p.name ?? "",
      cpf: p.cpf ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : "",
      origin: p.origin ?? "",
      notes: p.notes ?? "",
      selectedPlanIds: [],
      __insuranceNames: insuranceNames,
    } as any);
    setSaveError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(EMPTY_FORM);
    if (editId) router.replace("/pacientes");
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    await fetch(`/api/patients/${id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDeleteId(null);
    mutate();
  }

  // Abre o modal de edição quando chega com ?edit=ID (ex: vindo da ficha)
  useEffect(() => {
    if (!editId || showModal) return;
    (async () => {
      const res = await fetch(`/api/patients/${editId}`);
      if (!res.ok) return;
      const p = await res.json();
      openEdit(p);
    })();
  }, [editId]);

  function togglePlan(id: string) {
    setForm((f: any) => ({
      ...f,
      selectedPlanIds: f.selectedPlanIds.includes(id)
        ? f.selectedPlanIds.filter((p: string) => p !== id)
        : [...f.selectedPlanIds, id],
    }));
  }

  const canSave = form.name.trim() && form.phone.trim();

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);

    const insuranceNames = plans
      .filter((p) => form.selectedPlanIds.includes(p.id))
      .map((p) => p.name)
      .join(", ");

    const payload = {
      name: form.name,
      cpf: form.cpf || null,
      phone: form.phone,
      email: form.email || null,
      birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
      insurance: insuranceNames || null,
      origin: form.origin || null,
      notes: form.notes || null,
    };

    const isEdit = Boolean(form.id);
    const res = await fetch(isEdit ? `/api/patients/${form.id}` : "/api/patients", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      const data = await res.json();
      setSaveError(data.message ?? "Paciente duplicado.");
      setSaving(false);
      return;
    }

    setSaving(false);
    closeModal();
    mutate();
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : (
              <>
                {totalPatients} paciente{totalPatients !== 1 ? "s" : ""}
                {totalPatients > patients.length && <span className="ml-1 text-xs">(exibindo {patients.length})</span>}
              </>
            )}
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90">
          <UserPlus className="w-3.5 h-3.5" /> Novo Paciente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
          >
            <option value="">Todos os perfis</option>
            {PROFILES.filter(Boolean).map((p) => (
              <option key={p} value={p}>{PROFILE_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Perfil badges */}
      <div className="flex gap-2 flex-wrap">
        {PROFILES.map((p) => (
          <button
            key={p || "all"}
            onClick={() => setProfile(p)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              profile === p
                ? "bg-primary text-primary-foreground border-primary"
                : p
                ? cn(PROFILE_COLORS[p], "border-transparent")
                : "bg-white text-muted-foreground border-border hover:border-primary"
            )}
          >
            {p ? PROFILE_LABELS[p] : "Todos"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] text-xs font-semibold text-muted-foreground px-5 py-3 border-b border-border bg-muted/30">
            <span>Paciente</span><span>Contato</span><span>Última consulta</span><span>Total gasto</span><span />
          </div>
          {patients.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">Nenhum paciente encontrado</div>
          )}
          {patients.map((p: any) => (
            <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-5 py-3.5 border-b border-border/50 hover:bg-muted/20 transition-colors items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {p.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.insurance && <p className="text-xs text-muted-foreground">{p.insurance}</p>}
                  </div>
                </div>
                <div className="flex gap-1 mt-1.5 ml-9">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", PROFILE_COLORS[p.profile])}>
                    {PROFILE_LABELS[p.profile]}
                  </span>
                  {p.tags?.slice(0, 2).map((t: any) => (
                    <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t.tag}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-0.5">
                {p.phone && <p className="text-xs flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{p.phone}</p>}
                {p.email && <p className="text-xs flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" /><span className="truncate max-w-[120px]">{p.email}</span></p>}
              </div>
              <div className="text-xs text-muted-foreground">
                {p.lastConsultDate ? formatDate(p.lastConsultDate) : "—"}
                <p className="text-[10px]">{p.totalAppointments} consulta{p.totalAppointments !== 1 ? "s" : ""}</p>
              </div>
              <div className="text-sm font-semibold">{formatCurrency(p.totalSpent)}</div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => openEdit(p)}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Editar paciente"
                  title="Editar paciente"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <Link
                  href={`/pacientes/${p.id}`}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Ver ficha"
                  title="Ver ficha"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                {isAdmin && (
                  confirmDeleteId === p.id ? (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting}
                        className="px-2 py-1 text-[10px] font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting ? "..." : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-[10px] font-medium border border-border rounded-md hover:bg-muted"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-600"
                      aria-label="Excluir paciente"
                      title="Excluir paciente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Paciente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-sm">{form.id ? "Editar Paciente" : "Novo Paciente"}</h3>
              <button onClick={closeModal}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto">

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Maria Silva"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Telefone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">CPF</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="maria@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Data de nascimento</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-violet-500" /> Convênio
                </label>
                {plans.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 text-center">
                    Nenhum convênio cadastrado
                  </p>
                ) : (
                  <div className="border border-border rounded-lg divide-y divide-border/50 overflow-hidden">
                    {plans.map((plan) => {
                      const selected = form.selectedPlanIds.includes(plan.id);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => togglePlan(plan.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            selected ? "bg-violet-50" : "hover:bg-muted/40"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            selected ? "bg-violet-600 border-violet-600" : "border-border"
                          )}>
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="text-xs font-medium flex-1">{plan.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Origem</label>
                <input
                  type="text"
                  placeholder="Indicação, Instagram..."
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Observações</label>
                <textarea
                  placeholder="Anotações gerais sobre o paciente..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

            </div>

            {saveError && (
              <div className="px-5 pb-2 flex-shrink-0">
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
              </div>
            )}

            <div className="px-5 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
              <p className="text-[10px] text-muted-foreground"><span className="text-red-500">*</span> campos obrigatórios</p>
              <div className="flex gap-2">
                <button onClick={closeModal} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : form.id ? "Salvar alterações" : "Cadastrar paciente"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
