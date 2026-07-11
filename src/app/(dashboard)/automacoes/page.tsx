"use client";
import { useState } from "react";
import { Zap, Copy, Check, ExternalLink, Webhook, Activity, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENTS = [
  {
    event: "appointment.created",
    label: "Agendamento criado",
    color: "bg-blue-100 text-blue-700",
    description: "Disparado quando um novo agendamento é criado (sistema ou bot).",
    payload: {
      event: "appointment.created",
      timestamp: "2026-04-29T10:00:00Z",
      clinicId: "clx...",
      data: {
        appointmentId: "clx...",
        patientName: "Maria Fernanda Costa",
        patientPhone: "(11) 99100-2233",
        doctorName: "Dr. Rodrigo Alves",
        dateTime: "2026-04-30T09:00:00Z",
        service: "Consulta",
        isReturn: false,
        insurance: "Particular",
        value: 250,
      },
    },
  },
  {
    event: "appointment.confirmed",
    label: "Agendamento confirmado",
    color: "bg-emerald-100 text-emerald-700",
    description: "Disparado quando status muda para CONFIRMED (via sistema ou WhatsApp).",
    payload: {
      event: "appointment.confirmed",
      timestamp: "2026-04-29T10:05:00Z",
      clinicId: "clx...",
      data: {
        appointmentId: "clx...",
        patientName: "Maria Fernanda Costa",
        patientPhone: "(11) 99100-2233",
        dateTime: "2026-04-30T09:00:00Z",
        confirmedVia: "whatsapp",
      },
    },
  },
  {
    event: "appointment.cancelled",
    label: "Agendamento cancelado",
    color: "bg-red-100 text-red-700",
    description: "Disparado quando o paciente ou a recepção cancela a consulta.",
    payload: {
      event: "appointment.cancelled",
      timestamp: "2026-04-29T11:00:00Z",
      clinicId: "clx...",
      data: {
        appointmentId: "clx...",
        patientName: "Carlos Eduardo Mendes",
        patientPhone: "(11) 98877-6655",
        dateTime: "2026-04-30T14:00:00Z",
        reason: "Paciente solicitou cancelamento",
      },
    },
  },
  {
    event: "appointment.completed",
    label: "Consulta realizada",
    color: "bg-indigo-100 text-indigo-700",
    description: "Disparado quando a consulta é marcada como COMPLETED.",
    payload: {
      event: "appointment.completed",
      timestamp: "2026-04-29T15:00:00Z",
      clinicId: "clx...",
      data: {
        appointmentId: "clx...",
        patientId: "clx...",
        patientName: "Ana Paula Silveira",
        patientPhone: "(11) 95544-3322",
        service: "Consulta",
        value: 250,
        isReturn: false,
        doctorName: "Dr. Rodrigo Alves",
      },
    },
  },
  {
    event: "appointment.no_show",
    label: "Paciente faltou",
    color: "bg-orange-100 text-orange-700",
    description: "Disparado quando paciente não comparece à consulta.",
    payload: {
      event: "appointment.no_show",
      timestamp: "2026-04-29T09:35:00Z",
      clinicId: "clx...",
      data: {
        appointmentId: "clx...",
        patientId: "clx...",
        patientName: "Fernanda Oliveira",
        patientPhone: "(11) 93322-1100",
        dateTime: "2026-04-29T09:00:00Z",
        noShowCount: 2,
        suggestedAction: "Enviar mensagem de reagendamento",
      },
    },
  },
  {
    event: "patient.created",
    label: "Paciente cadastrado",
    color: "bg-sky-100 text-sky-700",
    description: "Disparado quando um novo paciente é cadastrado no sistema.",
    payload: {
      event: "patient.created",
      timestamp: "2026-04-29T09:00:00Z",
      clinicId: "clx...",
      data: {
        patientId: "clx...",
        name: "Gabriel Torres",
        phone: "(11) 90099-8877",
        email: "gabriel.torres@email.com",
        origin: "Indicação",
        insurance: "Particular",
      },
    },
  },
  {
    event: "patient.inactive",
    label: "Paciente inativo (+90 dias)",
    color: "bg-red-100 text-red-700",
    description: "Disparado quando o sistema detecta que um paciente está inativo há mais de 90 dias.",
    payload: {
      event: "patient.inactive",
      timestamp: "2026-04-29T00:01:00Z",
      clinicId: "clx...",
      data: {
        patientId: "clx...",
        patientName: "Carlos Eduardo Mendes",
        patientPhone: "(11) 98877-6655",
        lastConsultDate: "2026-01-09T00:00:00Z",
        daysSinceLastConsult: 110,
        totalSpent: 620,
        totalAppointments: 3,
        suggestedAction: "reactivation_message",
        reactivationMessage: "Olá Carlos! Sentimos sua falta! Temos horários disponíveis esta semana. Quer agendar?",
      },
    },
  },
  {
    event: "patient.pending_return",
    label: "Retorno pendente identificado",
    color: "bg-amber-100 text-amber-700",
    description: "Disparado quando o sistema identifica que um paciente deveria ter retornado.",
    payload: {
      event: "patient.pending_return",
      timestamp: "2026-04-29T00:01:00Z",
      clinicId: "clx...",
      data: {
        patientId: "clx...",
        patientName: "Roberto Santana",
        patientPhone: "(11) 96655-4433",
        lastConsultDate: "2026-02-24T00:00:00Z",
        avgReturnDays: 45,
        daysSinceLastConsult: 65,
        overdueDays: 20,
        suggestedAction: "Agendar consulta de retorno",
      },
    },
  },
  {
    event: "crm.opportunity.created",
    label: "Oportunidade de CRM criada",
    color: "bg-violet-100 text-violet-700",
    description: "Disparado quando uma nova oportunidade é gerada automaticamente pelo sistema.",
    payload: {
      event: "crm.opportunity.created",
      timestamp: "2026-04-29T00:01:00Z",
      clinicId: "clx...",
      data: {
        opportunityId: "clx...",
        patientId: "clx...",
        patientName: "Lucia Aparecida Moura",
        type: "REACTIVATION",
        reason: "Paciente de alto valor sem consulta há 120 dias",
        suggestedAction: "Ligação pessoal do médico + oferta de avaliação completa",
        priority: "HIGH",
      },
    },
  },
];

const API_ENDPOINTS = [
  { method: "GET", path: "/api/v1/appointments/available-slots?date=2026-04-30&doctorId=...", desc: "Horários disponíveis" },
  { method: "POST", path: "/api/v1/appointments", desc: "Criar agendamento" },
  { method: "PATCH", path: "/api/v1/appointments/:id/status", desc: "Atualizar status" },
  { method: "POST", path: "/api/v1/patients", desc: "Criar ou upsert paciente" },
  { method: "POST", path: "/api/v1/patients/:id/interactions", desc: "Registrar interação" },
  { method: "POST", path: "/api/v1/crm/opportunities", desc: "Criar oportunidade de CRM" },
  { method: "POST", path: "/api/v1/webhooks/inbound", desc: "Receber webhook externo (Z-API, Evolution API)" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PATCH: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 hover:bg-white/20 rounded transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
    </button>
  );
}

function EventCard({ ev }: { ev: typeof EVENTS[0] }) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(ev.payload, null, 2);
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <button className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors" onClick={() => setOpen(!open)}>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full font-mono", ev.color)}>{ev.event}</span>
        <span className="text-sm font-medium flex-1">{ev.label}</span>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-border">
          <div className="px-5 py-3 bg-muted/20 text-xs text-muted-foreground">{ev.description}</div>
          <div className="relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <CopyButton text={json} />
            </div>
            <pre className="text-[11px] bg-slate-900 text-slate-300 p-4 overflow-x-auto scrollbar-thin leading-relaxed">
              {json}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AutomacoesPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey] = useState("sk_clinic_" + "••••••••••••••••");
  const [testSent, setTestSent] = useState(false);

  const MOCK_LOG = [
    { event: "appointment.created", status: "success", ts: "29/04 10:32", ms: 245 },
    { event: "patient.inactive", status: "success", ts: "29/04 00:01", ms: 312 },
    { event: "crm.opportunity.created", status: "success", ts: "29/04 00:01", ms: 198 },
    { event: "appointment.no_show", status: "failed", ts: "28/04 16:45", ms: 5000 },
    { event: "appointment.confirmed", status: "success", ts: "28/04 14:20", ms: 187 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Automações — n8n Ready</h1>
        <p className="text-sm text-muted-foreground">Configure webhooks e endpoints para integrar com n8n, WhatsApp, e-mail, SMS e planilhas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Config do webhook */}
        <div className="lg:col-span-2 space-y-5">

          {/* URL do n8n */}
          <div className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Webhook className="w-4 h-4 text-primary" /> Webhook do n8n</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">URL do webhook (n8n, Zapier, Make...)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://seu-n8n.com/webhook/clinica-..."
                  className="flex-1 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => { setTestSent(true); setTimeout(() => setTestSent(false), 2000); }}
                  disabled={!webhookUrl}
                  className="px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-40 whitespace-nowrap"
                >
                  {testSent ? "✓ Enviado!" : "Testar ping"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Todos os eventos da lista abaixo serão enviados para esta URL via POST com o payload JSON.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" /> API Key (para endpoints /api/v1/)</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg font-mono text-xs text-muted-foreground">
                <span className="flex-1">{apiKey}</span>
                <Copy className="w-3 h-3 cursor-pointer hover:text-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Envie no header: <code className="bg-muted px-1 py-0.5 rounded">X-API-Key: sua-chave</code></p>
            </div>
          </div>

          {/* Eventos */}
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Eventos disponíveis</h2>
            <div className="space-y-2">
              {EVENTS.map((ev) => <EventCard key={ev.event} ev={ev} />)}
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        <div className="space-y-5">
          {/* Endpoints da API */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-3">Endpoints para n8n</h3>
            <div className="space-y-2">
              {API_ENDPOINTS.map((ep) => (
                <div key={ep.path} className="p-2.5 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", METHOD_COLORS[ep.method])}>{ep.method}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{ep.desc}</span>
                  </div>
                  <code className="text-[9px] text-slate-500 break-all">{ep.path}</code>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                Autenticação via header <code className="bg-muted px-1 rounded">X-API-Key</code>.
                Respostas sempre em JSON.
              </p>
            </div>
          </div>

          {/* Log de automações */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-3">Últimas automações</h3>
            <div className="space-y-2">
              {MOCK_LOG.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", log.status === "success" ? "bg-emerald-500" : "bg-red-500")} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] truncate text-muted-foreground">{log.event}</p>
                    <p className="text-[9px] text-muted-foreground/60">{log.ts} · {log.ms}ms</p>
                  </div>
                  <span className={cn("text-[9px] font-medium", log.status === "success" ? "text-emerald-600" : "text-red-500")}>
                    {log.status === "success" ? "200" : "timeout"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Integrações sugeridas */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-3">Integrações sugeridas</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              {[
                { icon: "📱", name: "WhatsApp", tools: "Z-API, Evolution API, Twilio" },
                { icon: "📧", name: "E-mail", tools: "Gmail, SMTP, Resend" },
                { icon: "📊", name: "Planilhas", tools: "Google Sheets, Airtable" },
                { icon: "📅", name: "Calendário", tools: "Google Calendar" },
                { icon: "🔔", name: "SMS", tools: "Twilio, Zenvia, Total Voice" },
                { icon: "🤖", name: "IA", tools: "OpenAI, Claude API" },
              ].map((item) => (
                <div key={item.name} className="flex items-start gap-2">
                  <span>{item.icon}</span>
                  <div>
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-muted-foreground"> — {item.tools}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
