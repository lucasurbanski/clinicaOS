"use client";
import { useEffect, useState } from "react";
import { Plus, X, Shield, Stethoscope, Pencil, Check } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function ConveniosPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  const load = () =>
    Promise.all([
      fetch("/api/convenios").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([p, s]) => {
      setPlans(p);
      setServices(s.filter((sv: any) => sv.active));
      setLoading(false);
    });

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setName("");
    setSelectedServiceIds([]);
    setServiceSearch("");
    setShowModal(true);
  }

  function openEdit(plan: any) {
    setEditingId(plan.id);
    setName(plan.name);
    setSelectedServiceIds(plan.services.map((s: any) => s.serviceId));
    setServiceSearch("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setName("");
    setSelectedServiceIds([]);
    setServiceSearch("");
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const payload = { name, serviceIds: selectedServiceIds };

    if (editingId) {
      await fetch(`/api/convenios/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/convenios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setSaving(false);
    closeModal();
    load();
  }

  async function handleToggleActive(plan: any) {
    await fetch(`/api/convenios/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !plan.active }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este convênio?")) return;
    await fetch(`/api/convenios/${id}`, { method: "DELETE" });
    load();
  }

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Convênios</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${plans.length} convênio${plans.length !== 1 ? "s" : ""} cadastrado${plans.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Novo Convênio
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-36 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum convênio cadastrado</p>
          <button onClick={openCreate} className="mt-4 text-xs text-primary font-medium hover:underline">Cadastrar primeiro convênio</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={cn("bg-white rounded-xl border p-5 transition-all", plan.active ? "border-border" : "border-border/40 opacity-60")}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-[10px] text-muted-foreground">{plan.services.length} serviço{plan.services.length !== 1 ? "s" : ""} atrelado{plan.services.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(plan)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", plan.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}
                  >
                    {plan.active ? "Ativo" : "Inativo"}
                  </button>
                </div>
              </div>
              {plan.services.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                  {plan.services.map((ps: any) => (
                    <div key={ps.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Stethoscope className="w-3 h-3 flex-shrink-0" />
                      <span className="flex-1 truncate">{ps.service.name}</span>
                      <span className="font-medium text-foreground">{formatCurrency(ps.service.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => handleDelete(plan.id)}
                className="mt-3 w-full text-[10px] text-red-400 hover:text-red-600 transition-colors text-center"
              >
                Excluir convênio
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-sm">{editingId ? "Editar Convênio" : "Novo Convênio"}</h3>
              <button onClick={closeModal}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nome do convênio *</label>
                <input
                  type="text"
                  placeholder="Unimed, Bradesco Saúde..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Serviços atendidos{" "}
                  <span className="text-primary font-semibold">({selectedServiceIds.length} selecionado{selectedServiceIds.length !== 1 ? "s" : ""})</span>
                </label>
                <input
                  type="text"
                  placeholder="Buscar serviço..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="border border-border rounded-lg divide-y divide-border/50 max-h-52 overflow-y-auto">
                  {filteredServices.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum serviço encontrado</p>
                  )}
                  {filteredServices.map((s) => {
                    const selected = selectedServiceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          selected ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                          selected ? "bg-primary border-primary" : "border-border"
                        )}>
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="flex-1 text-xs font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">{formatCurrency(s.value)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2 flex-shrink-0">
              <button onClick={closeModal} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
