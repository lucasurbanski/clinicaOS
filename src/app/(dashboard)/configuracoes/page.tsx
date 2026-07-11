"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Bot, Building2, Clock, Plug, ShieldCheck, Bell } from "lucide-react";
import { CONFIGURABLE_ROUTES, DEFAULT_PERMISSIONS } from "@/lib/menu-permissions";

const DAY_MAP: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };
const DAY_LABELS = [
  { key: "mon", label: "Seg" }, { key: "tue", label: "Ter" }, { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" }, { key: "fri", label: "Sex" }, { key: "sat", label: "Sáb" }, { key: "sun", label: "Dom" },
];

const AGENT_TONES = [
  { value: "professional", label: "Profissional" },
  { value: "friendly", label: "Acolhedora" },
  { value: "casual", label: "Descontraída" },
  { value: "formal", label: "Formal" },
];

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Rio_Branco",
];

function daysToString(days: Record<string, boolean>) {
  return Object.entries(DAY_MAP)
    .filter(([key]) => days[key])
    .map(([, num]) => num)
    .join(",");
}

function stringToDays(str: string) {
  const nums = (str || "1,2,3,4,5").split(",").map(Number);
  return { mon: nums.includes(1), tue: nums.includes(2), wed: nums.includes(3), thu: nums.includes(4), fri: nums.includes(5), sat: nums.includes(6), sun: nums.includes(7) };
}

const DEFAULT_FORM = {
  clinicName: "", doctorName: "", phone: "", email: "", address: "",
  openingTime: "08:00", closingTime: "18:00",
  defaultDuration: "30", intervalBetween: "10", maxBookingDays: "60", sameDayLeadMinutes: "60",
  days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
  agentName: "Vanessa", agentTone: "professional", agentDescription: "",
  evolutionInstance: "", timezone: "America/Sao_Paulo",
  confirmationMessage: "", reminderMessage: "", reminder24hEnabled: false,
};

function TextareaField({ label, value, onChange, placeholder = "", hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", disabled, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

const ROLES_TO_CONFIGURE = [
  { key: "RECEPTIONIST", label: "Recepcionista" },
  { key: "DOCTOR", label: "Médico" },
];

function buildDefaultPerms(): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {};
  for (const r of ROLES_TO_CONFIGURE) {
    result[r.key] = {};
    for (const route of CONFIGURABLE_ROUTES) {
      result[r.key][route.href] = DEFAULT_PERMISSIONS[r.key]?.includes(route.href) ?? false;
    }
  }
  return result;
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes((session?.user as any)?.role ?? "");

  const [form, setForm] = useState(DEFAULT_FORM);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [menuPerms, setMenuPerms] = useState<Record<string, Record<string, boolean>>>(buildDefaultPerms);
  const [permSaved, setPermSaved] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setForm({
            clinicName: data.name ?? "",
            doctorName: "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            address: data.address ?? "",
            openingTime: data.openingTime ?? "08:00",
            closingTime: data.closingTime ?? "18:00",
            defaultDuration: String(data.defaultDuration ?? 30),
            intervalBetween: String(data.intervalBetween ?? 10),
            maxBookingDays: String(data.maxBookingDays ?? 60),
            sameDayLeadMinutes: String(data.sameDayLeadMinutes ?? 60),
            days: stringToDays(data.availableDays),
            agentName: data.agentName ?? "Vanessa",
            agentTone: data.agentTone ?? "professional",
            agentDescription: data.agentDescription ?? "",
            evolutionInstance: data.evolutionInstance ?? "",
            timezone: data.timezone ?? "America/Sao_Paulo",
            confirmationMessage: data.confirmationMessage ?? "",
            reminderMessage: data.reminderMessage ?? "",
            reminder24hEnabled: data.reminder24hEnabled ?? false,
          });

          // Load menu permissions
          if (data.menuPermissions) {
            try {
              const saved = JSON.parse(data.menuPermissions) as Record<string, string[]>;
              const built = buildDefaultPerms();
              for (const role of ROLES_TO_CONFIGURE) {
                if (saved[role.key]) {
                  for (const route of CONFIGURABLE_ROUTES) {
                    built[role.key][route.href] = saved[role.key].includes(route.href);
                  }
                }
              }
              setMenuPerms(built);
            } catch {}
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicName: form.clinicName,
        phone: form.phone,
        email: form.email,
        address: form.address,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        defaultDuration: parseInt(form.defaultDuration),
        intervalBetween: parseInt(form.intervalBetween),
        maxBookingDays: parseInt(form.maxBookingDays) || 60,
        sameDayLeadMinutes: parseInt(form.sameDayLeadMinutes) || 60,
        availableDays: daysToString(form.days),
        agentName: form.agentName,
        agentTone: form.agentTone,
        agentDescription: form.agentDescription || null,
        evolutionInstance: form.evolutionInstance,
        timezone: form.timezone,
        confirmationMessage: form.confirmationMessage || null,
        reminderMessage: form.reminderMessage || null,
        reminder24hEnabled: form.reminder24hEnabled,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSavePerms() {
    setPermSaving(true);
    const permsJson: Record<string, string[]> = {};
    for (const role of ROLES_TO_CONFIGURE) {
      permsJson[role.key] = CONFIGURABLE_ROUTES
        .filter((r) => menuPerms[role.key]?.[r.href])
        .map((r) => r.href);
    }
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuPermissions: JSON.stringify(permsJson) }),
    });
    setPermSaving(false);
    setPermSaved(true);
    setTimeout(() => setPermSaved(false), 2000);
  }

  function togglePerm(role: string, href: string) {
    setMenuPerms((p) => ({
      ...p,
      [role]: { ...p[role], [href]: !p[role]?.[href] },
    }));
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Personalize seu consultório</p>
        </div>
        {!loading && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-52 bg-muted rounded-xl animate-pulse" />
          <div className="h-44 bg-muted rounded-xl animate-pulse" />
          <div className="h-44 bg-muted rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Dados do Consultório</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome do consultório" value={form.clinicName} onChange={set("clinicName")} />
              <Field label="Telefone" value={form.phone} onChange={set("phone")} />
              <Field label="E-mail" value={form.email} onChange={set("email")} />
              <SelectField
                label="Fuso horário"
                value={form.timezone}
                onChange={set("timezone")}
                options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
              />
            </div>
            <Field label="Endereço" value={form.address} onChange={set("address")} />
          </section>

          <section className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horários de Funcionamento</h2>
            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setForm((f) => ({ ...f, days: { ...f.days, [key]: !(f.days as any)[key] } }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    (form.days as any)[key]
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-muted-foreground border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Abertura" value={form.openingTime} onChange={set("openingTime")} type="time" />
              <Field label="Fechamento" value={form.closingTime} onChange={set("closingTime")} type="time" />
              <Field label="Duração padrão (min)" value={form.defaultDuration} onChange={set("defaultDuration")} type="number" />
              <Field label="Intervalo entre consultas (min)" value={form.intervalBetween} onChange={set("intervalBetween")} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Antecedência máxima (dias)" value={form.maxBookingDays} onChange={set("maxBookingDays")} type="number" hint="O agente agenda no máximo até esse nº de dias à frente." />
              <Field label="Margem no dia atual (min)" value={form.sameDayLeadMinutes} onChange={set("sameDayLeadMinutes")} type="number" hint="No mesmo dia, só oferece horários a partir de agora + essa margem." />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Bot className="w-4 h-4 text-violet-500" /> Agente de IA (WhatsApp)</h2>
            <p className="text-xs text-muted-foreground -mt-2">
              Configurações usadas pelo agente que conversa com seus pacientes no WhatsApp.
              Mudanças entram em vigor na próxima conversa.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Nome da atendente IA"
                value={form.agentName}
                onChange={set("agentName")}
                placeholder="Ex: Vanessa"
                hint="Como o agente se apresenta nas conversas"
              />
              <SelectField
                label="Tom da conversa"
                value={form.agentTone}
                onChange={set("agentTone")}
                options={AGENT_TONES}
                hint="Estilo que o agente usa ao responder"
              />
            </div>
            <TextareaField
              label="Descrição da clínica (contexto para o agente)"
              value={form.agentDescription}
              onChange={set("agentDescription")}
              placeholder="Ex: Clínica de dermatologia, atende apenas adultos a partir de 18 anos. Não realiza cirurgias plásticas."
              hint="O agente usa isso para responder dúvidas sobre o perfil da clínica. Deixe em branco para que a equipe responda manualmente."
            />
          </section>

          <section className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-blue-500" /> Mensagens Automáticas</h2>
            <p className="text-xs text-muted-foreground -mt-2">
              Personalize as mensagens enviadas automaticamente pelo WhatsApp. Deixe em branco para usar o texto padrão do sistema.
            </p>
            <div className="inline-flex flex-wrap gap-1.5 text-[10px] text-muted-foreground bg-muted px-3 py-2 rounded-lg">
              <span className="font-semibold text-foreground">Variáveis disponíveis:</span>
              {["{nome}", "{medico}", "{servico}", "{hora}", "{data}"].map((v) => (
                <code key={v} className="bg-white border border-border rounded px-1 py-0.5 font-mono text-foreground">{v}</code>
              ))}
            </div>
            <TextareaField
              label="Lembrete 3h antes — principal"
              value={form.reminderMessage}
              onChange={set("reminderMessage")}
              placeholder="Ex: Olá, {nome}! Lembrete: você tem consulta de {servico} com {medico} hoje às {hora}. Se precisar remarcar ou cancelar, é só me avisar por aqui."
              hint="Enviado ~3h antes da consulta. Se o paciente responder pedindo para remarcar ou cancelar, o agente resolve automaticamente."
            />
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.reminder24hEnabled}
                onChange={(e) => setForm({ ...form, reminder24hEnabled: e.target.checked })}
                className="mt-0.5"
              />
              <span className="text-xs">
                <span className="font-medium">Enviar também um lembrete 24h antes (opcional)</span>
                <span className="block text-muted-foreground">Um aviso informativo no dia anterior. Desligado por padrão.</span>
              </span>
            </label>
            <TextareaField
              label="Lembrete 24h antes — informativo (opcional)"
              value={form.confirmationMessage}
              onChange={set("confirmationMessage")}
              placeholder="Ex: Olá, {nome}! Passando para lembrar da sua consulta de {servico} com {medico} {data} às {hora}. Se não puder comparecer, me avise que remarcamos."
              hint="Só é enviado se a opção acima estiver ativada. Informativo, sem pedir confirmação."
            />
          </section>

          <section className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Plug className="w-4 h-4 text-amber-500" /> Integrações</h2>
            <Field
              label="Instância Evolution API"
              value={form.evolutionInstance}
              onChange={set("evolutionInstance")}
              placeholder="Ex: clinica-x"
              hint="Identificador da instância WhatsApp desta clínica. Não altere sem orientação da equipe técnica."
            />
          </section>

          {isAdmin && (
            <section className="bg-white rounded-xl border border-border p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-violet-500" /> Permissões de Menu
                </h2>
                <button
                  onClick={handleSavePerms}
                  disabled={permSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {permSaved ? "Salvo!" : permSaving ? "Salvando..." : "Salvar permissões"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground -mt-3">
                Defina quais abas cada perfil pode acessar. Administradores sempre veem tudo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {ROLES_TO_CONFIGURE.map((role) => (
                  <div key={role.key}>
                    <p className="text-xs font-semibold text-foreground mb-2">{role.label}</p>
                    <div className="space-y-1.5">
                      {CONFIGURABLE_ROUTES.map((route) => (
                        <label
                          key={route.href}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div
                            onClick={() => togglePerm(role.key, route.href)}
                            className={`w-8 h-4 rounded-full relative flex-shrink-0 transition-colors cursor-pointer ${
                              menuPerms[role.key]?.[route.href]
                                ? "bg-emerald-500"
                                : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                                menuPerms[role.key]?.[route.href]
                                  ? "translate-x-4"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </div>
                          <span className="text-xs text-foreground">{route.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
