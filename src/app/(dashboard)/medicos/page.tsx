"use client";
import { useState } from "react";
import useSWR from "swr";
import { Plus, X, Pencil, Stethoscope, UserPlus, Mail, Phone, BadgeCheck, Power } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type Doctor = {
  id: string;
  name: string;
  specialty: string | null;
  crm: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  availableDays?: string;
  openingTime?: string | null;
  closingTime?: string | null;
  serviceIds?: string[];
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  doctorId: string | null;
};

const EMPTY = { name: "", specialty: "", crm: "", phone: "", email: "", active: true, availableDays: "1,2,3,4,5", openingTime: "", closingTime: "", serviceIds: [] as string[] };

export default function MedicosPage() {
  const { data: doctors = [], mutate: mutateDoctors, isLoading } = useSWR<Doctor[]>("/api/doctors", fetcher);
  const { data: users = [] } = useSWR<UserRow[] | { error: string }>("/api/users", fetcher);
  const userList: UserRow[] = Array.isArray(users) ? users : [];
  const { data: servicesData = [] } = useSWR("/api/services", fetcher);
  const services: any[] = Array.isArray(servicesData) ? servicesData : [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [createLogin, setCreateLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setCreateLogin(false);
    setLoginEmail("");
    setLoginPwd("");
    setErr(null);
    setOpen(true);
  }

  function openEdit(d: Doctor) {
    setEditing(d);
    setForm({
      name: d.name,
      specialty: d.specialty ?? "",
      crm: d.crm ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
      active: d.active,
      availableDays: d.availableDays ?? "1,2,3,4,5",
      openingTime: d.openingTime ?? "",
      closingTime: d.closingTime ?? "",
      serviceIds: d.serviceIds ?? [],
    });
    setCreateLogin(false);
    setLoginEmail("");
    setLoginPwd("");
    setErr(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
    setErr(null);
  }

  async function save() {
    if (!form.name.trim()) { setErr("Nome é obrigatório"); return; }
    setSaving(true);
    setErr(null);

    try {
      let doctorId = editing?.id;
      if (editing) {
        await fetch(`/api/doctors/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        const res = await fetch("/api/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.error || "Erro ao salvar médico");
        doctorId = created.id;
      }

      if (createLogin && doctorId) {
        if (!loginEmail.trim() || loginPwd.length < 6) {
          throw new Error("E-mail e senha (6+ caracteres) são obrigatórios para o login");
        }
        const resU = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPwd,
            name: form.name,
            role: "DOCTOR",
            doctorId,
          }),
        });
        const userJson = await resU.json();
        if (!resU.ok) throw new Error(userJson.error || "Erro ao criar usuário");
      }

      mutateDoctors();
      close();
    } catch (e: any) {
      setErr(e.message || "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(d: Doctor) {
    await fetch(`/api/doctors/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !d.active }),
    });
    mutateDoctors();
  }

  function findUserForDoctor(doctorId: string) {
    return userList.find((u) => u.doctorId === doctorId);
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" /> Médicos
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${doctors.length} médico${doctors.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-3.5 h-3.5" /> Novo médico
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Stethoscope className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum médico cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((d) => {
            const linkedUser = findUserForDoctor(d.id);
            return (
              <div
                key={d.id}
                className={cn(
                  "bg-white rounded-xl border p-5 transition-all",
                  d.active ? "border-border" : "border-border/40 opacity-60",
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{d.name}</h3>
                    {d.specialty && <p className="text-xs text-muted-foreground truncate">{d.specialty}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(d)}
                      title={d.active ? "Desativar" : "Ativar"}
                      className={cn(
                        "p-1 rounded transition-colors",
                        d.active ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-50",
                      )}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(d)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {d.crm && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <BadgeCheck className="w-3 h-3" /> CRM {d.crm}
                    </p>
                  )}
                  {d.phone && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> {d.phone}
                    </p>
                  )}
                  {d.email && (
                    <p className="text-muted-foreground flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3" /> {d.email}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    d.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                  )}>
                    {d.active ? "Ativo" : "Inativo"}
                  </span>
                  {linkedUser ? (
                    <span className="text-[10px] text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <UserPlus className="w-2.5 h-2.5" /> Login: {linkedUser.email}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Sem login</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">{editing ? "Editar médico" : "Novo médico"}</h3>
              <button onClick={close}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            <div className="overflow-y-auto p-5 space-y-3 flex-1">
              {[
                { label: "Nome *", key: "name", placeholder: "Dr(a). João Silva" },
                { label: "Especialidade", key: "specialty", placeholder: "Cardiologia" },
                { label: "CRM", key: "crm", placeholder: "12345/SP" },
                { label: "Telefone", key: "phone", placeholder: "(11) 99999-9999" },
                { label: "E-mail", key: "email", placeholder: "joao@clinica.com" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <input
                    type="text"
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}

              {/* Dias de atendimento */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Dias de atendimento</label>
                <div className="flex flex-wrap gap-1.5">
                  {([["1","Seg"],["2","Ter"],["3","Qua"],["4","Qui"],["5","Sex"],["6","Sáb"],["7","Dom"]] as [string,string][]).map(([num, lbl]) => {
                    const sel = form.availableDays.split(",").filter(Boolean).includes(num);
                    return (
                      <button key={num} type="button"
                        onClick={() => {
                          const cur = form.availableDays.split(",").filter(Boolean);
                          const next = (sel ? cur.filter((x) => x !== num) : [...cur, num]).sort();
                          setForm({ ...form, availableDays: next.join(",") });
                        }}
                        className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border", sel ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground border-border")}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horários (opcional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Abertura (opcional)</label>
                  <input type="time" value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Fechamento (opcional)</label>
                  <input type="time" value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">Horários em branco = usa o horário da clínica.</p>

              {/* Serviços que atende */}
              {services.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Serviços que atende</label>
                  <div className="flex flex-wrap gap-1.5">
                    {services.filter((s) => s.active).map((s) => {
                      const sel = form.serviceIds.includes(s.id);
                      return (
                        <button key={s.id} type="button"
                          onClick={() => setForm({ ...form, serviceIds: sel ? form.serviceIds.filter((x) => x !== s.id) : [...form.serviceIds, s.id] })}
                          className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border", sel ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-white text-muted-foreground border-border")}>
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Nenhum selecionado = atende todos os serviços da clínica.</p>
                </div>
              )}

              {editing && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-muted-foreground">Ativo</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      form.active ? "bg-emerald-500" : "bg-gray-300",
                    )}
                  >
                    <span className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                      form.active ? "translate-x-4.5" : "translate-x-0.5",
                    )} />
                  </button>
                </div>
              )}

              {!editing && (
                <div className="border border-violet-200 bg-violet-50 rounded-lg p-3 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createLogin}
                      onChange={(e) => setCreateLogin(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs font-semibold text-violet-900 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> Criar login para este médico
                    </span>
                  </label>
                  {createLogin && (
                    <div className="space-y-2">
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="E-mail de acesso"
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
                      />
                      <input
                        type="password"
                        value={loginPwd}
                        onChange={(e) => setLoginPwd(e.target.value)}
                        placeholder="Senha (mínimo 6 caracteres)"
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
                      />
                      <p className="text-[10px] text-violet-700">
                        Permite ao médico acessar a agenda e salvar anotações das consultas.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
            </div>

            <div className="px-5 py-3 border-t border-border flex gap-2 justify-end">
              <button onClick={close} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted">
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name}
                className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : editing ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
