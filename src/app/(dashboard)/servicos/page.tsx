"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Clock, DollarSign, X, Pencil, CreditCard, Banknote, Shield, Zap, CalendarRange, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = { CONSULTATION: "Consulta", RETURN: "Retorno", PROCEDURE: "Procedimento" };
const TYPE_COLORS: Record<string, string> = { CONSULTATION: "bg-blue-100 text-blue-700", RETURN: "bg-indigo-100 text-indigo-700", PROCEDURE: "bg-violet-100 text-violet-700" };

const TABS = ["info", "precos", "convenios", "agendamento"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { info: "Informações", precos: "Preços", convenios: "Convênios", agendamento: "Agendamento" };

type PlanPricing = { planId: string; name: string; cardValue: string; cashValue: string; pixValue: string };

type ScheduleRule = {
  id?: string;
  days: { mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean };
  maxPerDay: string;
  openingTime: string;
  closingTime: string;
  active: boolean;
};

const DAY_NUMS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS_S: Record<string, string> = { mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sáb", sun: "Dom" };

function daysToString(days: ScheduleRule["days"]) {
  return DAY_KEYS.filter((k) => days[k]).map((k) => DAY_NUMS[k]).join(",");
}

function stringToDays(str: string): ScheduleRule["days"] {
  const nums = (str || "1,2,3,4,5").split(",").map(Number);
  return {
    sun: nums.includes(0), mon: nums.includes(1), tue: nums.includes(2), wed: nums.includes(3),
    thu: nums.includes(4), fri: nums.includes(5), sat: nums.includes(6),
  };
}

function emptyRule(): ScheduleRule {
  return {
    days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
    maxPerDay: "",
    openingTime: "",
    closingTime: "",
    active: true,
  };
}

function buildEmptyForm() {
  return {
    name: "",
    duration: "30",
    value: "",
    type: "CONSULTATION",
    description: "",
    active: true,
    cardPrice: "",
    cashPrice: "",
    addedPlans: [] as PlanPricing[],
  };
}

export default function ServicosPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [rule, setRule] = useState<ScheduleRule>(emptyRule());
  const [originalRuleId, setOriginalRuleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/convenios").then((r) => r.json()),
    ]).then(([s, p]) => {
      setServices(Array.isArray(s) ? s : []);
      setPlans(Array.isArray(p) ? p.filter((pl: any) => pl.active) : []);
      setLoading(false);
    });

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setTab("info");
    setShowPlanPicker(false);
    setForm(buildEmptyForm());
    setRule(emptyRule());
    setOriginalRuleId(null);
    setShowModal(true);
  }

  async function loadRule(serviceId: string) {
    try {
      const res = await fetch(`/api/services/${serviceId}/schedule-rules`);
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const r = list[0];
        setOriginalRuleId(r.id);
        setRule({
          id: r.id,
          days: stringToDays(r.availableDays),
          maxPerDay: r.maxPerDay != null ? String(r.maxPerDay) : "",
          openingTime: r.openingTime ?? "",
          closingTime: r.closingTime ?? "",
          active: r.active,
        });
      } else {
        setOriginalRuleId(null);
        setRule(emptyRule());
      }
    } catch {
      setOriginalRuleId(null);
      setRule(emptyRule());
    }
  }

  function openEdit(s: any) {
    setEditingId(s.id);
    setTab("info");
    setShowPlanPicker(false);
    loadRule(s.id);

    const cardPricing = s.pricings?.find((p: any) => p.paymentMethod === "CARD");
    const cashPricing = s.pricings?.find((p: any) => p.paymentMethod === "CASH");

    const addedPlans: PlanPricing[] = (s.insurancePlanServices ?? []).map((ips: any) => ({
      planId: ips.insurancePlan.id,
      name: ips.insurancePlan.name,
      cardValue: ips.cardValue != null ? String(ips.cardValue) : "",
      cashValue: ips.cashValue != null ? String(ips.cashValue) : "",
      pixValue: ips.pixValue != null ? String(ips.pixValue) : "",
    }));

    setForm({
      name: s.name,
      duration: String(s.duration),
      value: String(s.value),
      type: s.type,
      description: s.description ?? "",
      active: s.active,
      cardPrice: cardPricing ? String(cardPricing.value) : "",
      cashPrice: cashPricing ? String(cashPricing.value) : "",
      addedPlans,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(null);
    setShowPlanPicker(false);
    setRule(emptyRule());
    setOriginalRuleId(null);
  }

  async function saveRule(serviceId: string) {
    const payload = {
      availableDays: daysToString(rule.days),
      maxPerDay: rule.maxPerDay !== "" ? parseInt(rule.maxPerDay) : null,
      openingTime: rule.openingTime || null,
      closingTime: rule.closingTime || null,
      active: rule.active,
    };
    if (originalRuleId) {
      await fetch(`/api/services/${serviceId}/schedule-rules/${originalRuleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/services/${serviceId}/schedule-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);

    const pricings: { paymentMethod: string; value: number }[] = [];
    if (form.cardPrice !== "") pricings.push({ paymentMethod: "CARD", value: parseFloat(form.cardPrice) });
    if (form.cashPrice !== "") pricings.push({ paymentMethod: "CASH", value: parseFloat(form.cashPrice) });

    const insurancePlanPrices = form.addedPlans.map((pp: PlanPricing) => ({
      planId: pp.planId,
      cardValue: pp.cardValue !== "" ? parseFloat(pp.cardValue) : undefined,
      cashValue: pp.cashValue !== "" ? parseFloat(pp.cashValue) : undefined,
      pixValue: pp.pixValue !== "" ? parseFloat(pp.pixValue) : undefined,
    }));

    const payload = {
      name: form.name,
      duration: parseInt(form.duration),
      value: parseFloat(form.value),
      type: form.type,
      description: form.description,
      active: form.active,
      pricings,
      insurancePlanPrices,
    };

    let serviceId = editingId;
    if (editingId) {
      await fetch(`/api/services/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      serviceId = created?.id ?? null;
    }

    if (serviceId) await saveRule(serviceId);

    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDeleteId(null);
    load();
  }

  function addPlan(plan: any) {
    setForm((f: any) => ({
      ...f,
      addedPlans: [...f.addedPlans, { planId: plan.id, name: plan.name, cardValue: "", cashValue: "", pixValue: "" }],
    }));
    setShowPlanPicker(false);
  }

  function removePlan(planId: string) {
    setForm((f: any) => ({ ...f, addedPlans: f.addedPlans.filter((pp: PlanPricing) => pp.planId !== planId) }));
  }

  function setPlanField(planId: string, field: keyof Omit<PlanPricing, "planId" | "name">, value: string) {
    setForm((f: any) => ({
      ...f,
      addedPlans: f.addedPlans.map((pp: PlanPricing) => pp.planId === planId ? { ...pp, [field]: value } : pp),
    }));
  }

  const availablePlans = form ? plans.filter((pl) => !form.addedPlans.some((pp: PlanPricing) => pp.planId === pl.id)) : [];
  const currentTabIdx = TABS.indexOf(tab);

  if (!form && showModal) return null;

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${services.length} serviço${services.length !== 1 ? "s" : ""} cadastrado${services.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Novo Serviço
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading && services.map((s: any) => (
          <div
            key={s.id}
            className={cn("bg-white rounded-xl border p-5 transition-all cursor-pointer hover:border-primary/40 hover:shadow-sm", s.active ? "border-border" : "border-border/40 opacity-60")}
            onClick={() => openEdit(s)}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", TYPE_COLORS[s.type])}>
                {TYPE_LABELS[s.type]}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", s.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                  {s.active ? "Ativo" : "Inativo"}
                </span>
                <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
                {isAdmin && (
                  confirmDeleteId === s.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting ? "..." : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 text-[10px] font-medium border border-border rounded hover:bg-muted"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id); }}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Excluir serviço"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )
                )}
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-1">{s.name}</h3>
            {s.description && <p className="text-xs text-muted-foreground mb-3">{s.description}</p>}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />{s.duration} min
              </span>
              <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                <DollarSign className="w-3 h-3" />{formatCurrency(s.value)}
              </span>
            </div>
            {(s.pricings?.length > 0 || s.insurancePlanServices?.length > 0) && (
              <div className="mt-2 pt-2 border-t border-border/30 flex flex-wrap gap-2">
                {s.pricings?.find((p: any) => p.paymentMethod === "CARD") && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600">
                    <CreditCard className="w-3 h-3" />{formatCurrency(s.pricings.find((p: any) => p.paymentMethod === "CARD").value)}
                  </span>
                )}
                {s.pricings?.find((p: any) => p.paymentMethod === "CASH") && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                    <Banknote className="w-3 h-3" />{formatCurrency(s.pricings.find((p: any) => p.paymentMethod === "CASH").value)}
                  </span>
                )}
                {s.insurancePlanServices?.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-violet-600">
                    <Shield className="w-3 h-3" />{s.insurancePlanServices.length} convênio{s.insurancePlanServices.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && form && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-sm">{editingId ? "Editar Serviço" : "Novo Serviço"}</h3>
              <button onClick={closeModal}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setShowPlanPicker(false); }}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-semibold transition-colors",
                    tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">

              {/* Tab Informações */}
              {tab === "info" && (
                <div className="p-5 space-y-3">
                  {[
                    { label: "Nome *", key: "name", type: "text", placeholder: "Consulta Clínica" },
                    { label: "Duração (min)", key: "duration", type: "number", placeholder: "30" },
                    { label: "Descrição", key: "description", type: "text", placeholder: "Opcional" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Tipo</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                    >
                      <option value="CONSULTATION">Consulta</option>
                      <option value="RETURN">Retorno</option>
                      <option value="PROCEDURE">Procedimento</option>
                    </select>
                  </div>
                  {editingId && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-medium text-muted-foreground">Status</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, active: !form.active })}
                        className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", form.active ? "bg-emerald-500" : "bg-gray-300")}
                      >
                        <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform", form.active ? "translate-x-4.5" : "translate-x-0.5")} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Preços */}
              {tab === "precos" && (
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Valor padrão (R$) *</label>
                    <input
                      type="number"
                      placeholder="250"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Usado quando nenhuma forma de pagamento específica for definida</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Cartão (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="Mesmo valor padrão"
                      value={form.cardPrice}
                      onChange={(e) => setForm({ ...form, cardPrice: e.target.value })}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-500" /> Dinheiro (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="Mesmo valor padrão"
                      value={form.cashPrice}
                      onChange={(e) => setForm({ ...form, cashPrice: e.target.value })}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* Tab Agendamento */}
              {tab === "agendamento" && (
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-lg p-3">
                    <CalendarRange className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-violet-900 leading-relaxed">
                      Define os dias e a quantidade diária deste serviço. A IA do WhatsApp respeita essas regras
                      automaticamente ao oferecer horários ao paciente.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Dias disponíveis</label>
                    <div className="flex gap-2 flex-wrap">
                      {DAY_KEYS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setRule((r) => ({ ...r, days: { ...r.days, [k]: !r.days[k] } }))}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                            rule.days[k]
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-white text-muted-foreground border-border",
                          )}
                        >
                          {DAY_LABELS_S[k]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Limite por dia</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Sem limite"
                      value={rule.maxPerDay}
                      onChange={(e) => setRule((r) => ({ ...r, maxPerDay: e.target.value }))}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Deixe vazio para não limitar</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Abertura (override)</label>
                      <input
                        type="time"
                        value={rule.openingTime}
                        onChange={(e) => setRule((r) => ({ ...r, openingTime: e.target.value }))}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Fechamento (override)</label>
                      <input
                        type="time"
                        value={rule.closingTime}
                        onChange={(e) => setRule((r) => ({ ...r, closingTime: e.target.value }))}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-2">
                    Se ficar em branco, usa o horário da clínica.
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-medium text-muted-foreground">Regra ativa</span>
                    <button
                      type="button"
                      onClick={() => setRule((r) => ({ ...r, active: !r.active }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        rule.active ? "bg-emerald-500" : "bg-gray-300",
                      )}
                    >
                      <span className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                        rule.active ? "translate-x-4.5" : "translate-x-0.5",
                      )} />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Convênios */}
              {tab === "convenios" && (
                <div className="p-5 space-y-3">
                  {plans.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center bg-muted/40 rounded-lg px-3 py-6">
                      Nenhum convênio cadastrado. Acesse o menu Convênios para criar.
                    </p>
                  ) : (
                    <>
                      {form.addedPlans.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          Nenhum convênio adicionado a este serviço
                        </p>
                      )}

                      {form.addedPlans.map((pp: PlanPricing) => (
                        <div key={pp.planId} className="border border-violet-200 rounded-lg overflow-hidden">
                          {/* Cabeçalho do plano */}
                          <div className="flex items-center justify-between px-3 py-2.5 bg-violet-50">
                            <span className="text-xs font-semibold text-violet-800 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" />{pp.name}
                            </span>
                            <button type="button" onClick={() => removePlan(pp.planId)} className="text-violet-400 hover:text-red-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Campos de preço */}
                          <div className="px-3 py-3 grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-medium text-blue-500 flex items-center gap-1 mb-1">
                                <CreditCard className="w-3 h-3" /> Cartão
                              </label>
                              <input
                                type="number"
                                placeholder="—"
                                value={pp.cardValue}
                                onChange={(e) => setPlanField(pp.planId, "cardValue", e.target.value)}
                                className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-emerald-500 flex items-center gap-1 mb-1">
                                <Banknote className="w-3 h-3" /> Dinheiro
                              </label>
                              <input
                                type="number"
                                placeholder="—"
                                value={pp.cashValue}
                                onChange={(e) => setPlanField(pp.planId, "cashValue", e.target.value)}
                                className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-violet-500 flex items-center gap-1 mb-1">
                                <Zap className="w-3 h-3" /> Pix
                              </label>
                              <input
                                type="number"
                                placeholder="—"
                                value={pp.pixValue}
                                onChange={(e) => setPlanField(pp.planId, "pixValue", e.target.value)}
                                className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Botão adicionar + picker */}
                      {availablePlans.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowPlanPicker(!showPlanPicker)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-violet-300 rounded-lg text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar convênio
                          </button>
                          {showPlanPicker && (
                            <div className="mt-1 border border-border rounded-lg bg-white shadow-sm overflow-hidden z-10 relative">
                              {availablePlans.map((pl, i) => (
                                <button
                                  key={pl.id}
                                  type="button"
                                  onClick={() => addPlan(pl)}
                                  className={cn(
                                    "w-full text-left px-3 py-2.5 text-xs hover:bg-violet-50 transition-colors flex items-center gap-2",
                                    i < availablePlans.length - 1 && "border-b border-border/50"
                                  )}
                                >
                                  <Shield className="w-3.5 h-3.5 text-violet-400" />{pl.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {availablePlans.length === 0 && form.addedPlans.length > 0 && (
                        <p className="text-[10px] text-muted-foreground text-center">Todos os convênios cadastrados foram adicionados</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {currentTabIdx > 0 && (
                  <button
                    onClick={() => setTab(TABS[currentTabIdx - 1])}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← {TAB_LABELS[TABS[currentTabIdx - 1]]}
                  </button>
                )}
                {currentTabIdx < TABS.length - 1 && (
                  <button
                    onClick={() => setTab(TABS[currentTabIdx + 1])}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {TAB_LABELS[TABS[currentTabIdx + 1]]} →
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={closeModal} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.value}
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
