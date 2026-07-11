"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MessageSquare, CheckCheck, Bot, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message { from: "bot" | "user"; text: string; time: Date; }

const BOT_DELAYS = 600;

const DOCTORS = [{ id: "dr1", name: "Dr. Rodrigo Alves", specialty: "Clínica Geral" }];
const SERVICES = [
  { id: "s1", name: "Consulta", value: 250, duration: 30 },
  { id: "s2", name: "Retorno", value: 120, duration: 20 },
  { id: "s3", name: "Avaliação Completa", value: 400, duration: 60 },
];
const TIME_SLOTS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00"];

function getAvailableDays() {
  const days = [];
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(d);
    }
    if (days.length >= 4) break;
  }
  return days;
}

function formatDay(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
}

export default function BotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [choices, setChoices] = useState<{ label: string; value: string }[]>([]);
  const [bookingData, setBookingData] = useState<any>({});
  const [isTyping, setIsTyping] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [savedAppt, setSavedAppt] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup de todos os timeouts pendentes ao desmontar o componente
  useEffect(() => () => { timeoutsRef.current.forEach(clearTimeout); }, []);

  const addBot = useCallback((text: string, newChoices?: { label: string; value: string }[]) => {
    setIsTyping(true);
    const t = setTimeout(() => {
      setMessages((prev) => [...prev, { from: "bot", text, time: new Date() }]);
      setChoices(newChoices || []);
      setIsTyping(false);
    }, BOT_DELAYS);
    timeoutsRef.current.push(t);
  }, []);

  useEffect(() => {
    if (step === 0) {
      addBot("Olá! 👋 Sou o assistente virtual do consultório Dr. Rodrigo Alves. Como posso ajudar você?", [
        { label: "📅 Agendar uma consulta", value: "schedule" },
        { label: "ℹ️ Informações", value: "info" },
      ]);
    }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  function userSays(text: string, value?: string) {
    setMessages((prev) => [...prev, { from: "user", text, time: new Date() }]);
    setChoices([]);

    const val = value || text;

    const t = setTimeout(() => {
      if (step === 0) {
        if (val === "schedule") {
          setStep(1);
          addBot("Ótimo! Vamos agendar sua consulta. 😊\n\nCom qual médico você gostaria de consultar?",
            DOCTORS.map((d) => ({ label: `${d.name} — ${d.specialty}`, value: d.id }))
          );
        } else {
          addBot("Funcionamos de segunda a sexta, das 8h às 18h. Para agendar, clique em 'Agendar uma consulta' abaixo.", [
            { label: "📅 Agendar uma consulta", value: "schedule" },
          ]);
        }
      } else if (step === 1) {
        setBookingData((b: any) => ({ ...b, doctorId: val, doctorName: DOCTORS.find((d) => d.id === val)?.name }));
        setStep(2);
        addBot("Qual tipo de atendimento você precisa?",
          SERVICES.map((s) => ({ label: `${s.name} — R$ ${s.value}`, value: s.id }))
        );
      } else if (step === 2) {
        const svc = SERVICES.find((s) => s.id === val);
        setBookingData((b: any) => ({ ...b, serviceId: val, serviceName: svc?.name, serviceValue: svc?.value }));
        setStep(3);
        addBot("A consulta será:\n• Particular\n• Convênio\n\nQual a sua situação?", [
          { label: "💳 Particular", value: "Particular" },
          { label: "🏥 Convênio", value: "Convênio" },
        ]);
      } else if (step === 3) {
        setBookingData((b: any) => ({ ...b, insurance: val }));
        setStep(4);
        addBot("É sua primeira consulta ou um retorno?", [
          { label: "🆕 Primeira consulta", value: "first" },
          { label: "🔄 Retorno", value: "return" },
        ]);
      } else if (step === 4) {
        setBookingData((b: any) => ({ ...b, isReturn: val === "return" }));
        setStep(5);
        const days = getAvailableDays();
        addBot("Quais datas estão disponíveis para você?",
          days.map((d) => ({ label: formatDay(d), value: d.toISOString() }))
        );
      } else if (step === 5) {
        const date = new Date(val);
        setBookingData((b: any) => ({ ...b, date: date.toISOString() }));
        setStep(6);
        addBot("Ótimo! Escolha um horário:", TIME_SLOTS.map((t) => ({ label: t, value: t })));
      } else if (step === 6) {
        setBookingData((b: any) => ({ ...b, time: val }));
        setStep(7);
        addBot("Qual é o seu nome completo?");
      } else if (step === 7) {
        setBookingData((b: any) => ({ ...b, patientName: val }));
        setStep(8);
        addBot("E o seu telefone para confirmação?");
      } else if (step === 8) {
        const finalData = { ...bookingData, phone: val };
        setBookingData(finalData);
        setStep(9);

        const dateObj = new Date(finalData.date);
        const [h, m] = (finalData.time || "09:00").split(":");
        dateObj.setHours(parseInt(h), parseInt(m), 0, 0);

        addBot(
          `✅ Perfeito! Vamos confirmar seu agendamento:\n\n👤 ${finalData.patientName}\n📞 ${val}\n👨‍⚕️ ${finalData.doctorName}\n🩺 ${finalData.serviceName}\n💳 ${finalData.insurance}\n📅 ${formatDay(new Date(finalData.date))}\n⏰ ${finalData.time}\n\nConfirmar o agendamento?`,
          [
            { label: "✅ Confirmar", value: "confirm" },
            { label: "❌ Cancelar", value: "cancel" },
          ]
        );
      } else if (step === 9) {
        if (val === "confirm") {
          const dateObj = new Date(bookingData.date);
          const [h, m] = (bookingData.time || "09:00").split(":");
          dateObj.setHours(parseInt(h), parseInt(m), 0, 0);

          setSavedAppt({
            patient: bookingData.patientName,
            phone: bookingData.phone,
            doctor: bookingData.doctorName,
            service: bookingData.serviceName,
            insurance: bookingData.insurance,
            dateTime: dateObj,
            isReturn: bookingData.isReturn,
          });
          setCompleted(true);
          addBot("🎉 Agendamento confirmado! Você receberá uma confirmação em breve. Até a consulta! 😊");
        } else {
          addBot("Agendamento cancelado. Podemos ajudar com mais alguma coisa?", [
            { label: "📅 Agendar uma consulta", value: "schedule" },
          ]);
          setStep(0);
          setBookingData({});
        }
      }
    }, 100);
    timeoutsRef.current.push(t);
  }

  function handleSend() {
    if (!input.trim()) return;
    userSays(input.trim());
    setInput("");
  }

  function restart() {
    setMessages([]);
    setStep(0);
    setChoices([]);
    setBookingData({});
    setCompleted(false);
    setSavedAppt(null);
    setTimeout(() => {
      addBot("Olá! 👋 Sou o assistente virtual do consultório Dr. Rodrigo Alves. Como posso ajudar você?", [
        { label: "📅 Agendar uma consulta", value: "schedule" },
        { label: "ℹ️ Informações", value: "info" },
      ]);
    }, 200);
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Simulador — Agendamento WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Fluxo de bot que pode ser integrado com WhatsApp Business API, Z-API, Evolution API ou Twilio</p>
        </div>
        <button onClick={restart} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors">
          Reiniciar simulação
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat */}
        <div className="lg:col-span-2">
          <div className="bg-[#e5ddd5] rounded-2xl overflow-hidden border border-border shadow-sm" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c1b89d' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
            {/* Header estilo WhatsApp */}
            <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Consultório Dr. Rodrigo</p>
                <p className="text-[10px] text-white/70">Assistente virtual · online</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="h-[460px] overflow-y-auto p-4 space-y-2 scrollbar-thin">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex", msg.from === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm",
                    msg.from === "bot"
                      ? "bg-white rounded-tl-none"
                      : "bg-[#dcf8c6] rounded-tr-none"
                  )}>
                    {msg.from === "bot" && (
                      <p className="text-[10px] font-semibold text-[#075e54] mb-1">Assistente</p>
                    )}
                    <p className="text-sm whitespace-pre-line">{msg.text}</p>
                    <div className={cn("flex items-center gap-1 mt-1", msg.from === "user" ? "justify-end" : "justify-start")}>
                      <span className="text-[9px] text-muted-foreground">
                        {msg.time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.from === "user" && <CheckCheck className="w-3 h-3 text-blue-500" />}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Opções rápidas */}
            {choices.length > 0 && (
              <div className="px-4 py-2 flex flex-wrap gap-2 bg-white/60 border-t border-black/5">
                {choices.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => userSays(c.label, c.value)}
                    className="px-3 py-1.5 bg-white border border-[#075e54]/30 text-[#075e54] text-xs font-medium rounded-full hover:bg-[#075e54] hover:text-white transition-colors shadow-sm"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="bg-[#f0f2f5] px-3 py-2 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Digite uma mensagem..."
                className="flex-1 bg-white rounded-full px-4 py-2 text-sm focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-9 h-9 bg-[#075e54] rounded-full flex items-center justify-center hover:bg-[#064e45] disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          {/* Dados coletados */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Dados coletados
            </h3>
            <div className="space-y-2 text-xs">
              {Object.keys(bookingData).length === 0 && <p className="text-muted-foreground">Aguardando interação...</p>}
              {bookingData.patientName && <div className="flex justify-between"><span className="text-muted-foreground">Paciente</span><span className="font-medium">{bookingData.patientName}</span></div>}
              {bookingData.phone && <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span className="font-medium">{bookingData.phone}</span></div>}
              {bookingData.doctorName && <div className="flex justify-between"><span className="text-muted-foreground">Médico</span><span className="font-medium">{bookingData.doctorName}</span></div>}
              {bookingData.serviceName && <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span className="font-medium">{bookingData.serviceName}</span></div>}
              {bookingData.insurance && <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span className="font-medium">{bookingData.insurance}</span></div>}
              {bookingData.isReturn !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-medium">{bookingData.isReturn ? "Retorno" : "1ª Consulta"}</span></div>}
              {bookingData.time && bookingData.date && <div className="flex justify-between"><span className="text-muted-foreground">Horário</span><span className="font-medium">{new Date(bookingData.date).toLocaleDateString("pt-BR")} às {bookingData.time}</span></div>}
            </div>
          </div>

          {/* Confirmação */}
          {completed && savedAppt && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-emerald-700">Agendamento criado!</h3>
              </div>
              <div className="space-y-1 text-xs text-emerald-800">
                <p>👤 {savedAppt.patient}</p>
                <p>📞 {savedAppt.phone}</p>
                <p>👨‍⚕️ {savedAppt.doctor}</p>
                <p>🩺 {savedAppt.service}</p>
                <p>📅 {savedAppt.dateTime.toLocaleString("pt-BR")}</p>
              </div>
              <p className="text-[10px] text-emerald-600 mt-2">* Em produção, este agendamento seria salvo na agenda automaticamente via API.</p>
            </div>
          )}

          {/* Fluxo */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Fluxo do bot</h3>
            <div className="space-y-1.5">
              {["Início", "Médico", "Serviço", "Convênio", "Tipo", "Data", "Horário", "Nome", "Telefone", "Confirmação"].map((s, i) => (
                <div key={s} className={cn("flex items-center gap-2 text-xs", i < step ? "text-emerald-600" : i === step ? "text-primary font-semibold" : "text-muted-foreground")}>
                  <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                    i < step ? "bg-emerald-100 text-emerald-700" : i === step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
