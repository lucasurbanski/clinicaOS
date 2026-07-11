"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { format, addDays, subDays, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Check, Clock, AlertCircle, FileText, Save, ChevronDown, Search } from "lucide-react";
import { cn, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_ICON: Record<string, any> = {
  CONFIRMED: <Check className="w-3 h-3" />,
  SCHEDULED: <Check className="w-3 h-3" />,
  PENDING: <Clock className="w-3 h-3" />,
  CANCELLED: <X className="w-3 h-3" />,
  NO_SHOW: <AlertCircle className="w-3 h-3" />,
};

const DOCTOR_PALETTE = ["#2563eb", "#db2777", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#0d9488"];

function buildHours(openingTime: string, closingTime: string) {
  const [oH, oM] = openingTime.split(":").map(Number);
  const [cH, cM] = closingTime.split(":").map(Number);
  const start = oH * 60 + oM;
  const end = cH * 60 + cM;
  const slots: string[] = [];
  for (let m = start; m < end; m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots;
}

export default function AgendaPage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const { data: session } = useSession();
  const isDoctor = (session?.user as any)?.role === "DOCTOR";
  const [showModal, setShowModal] = useState(false);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [form, setForm] = useState({ patientId: "", serviceId: "", doctorId: "", dateTime: "", insurance: "", notes: "", value: "" });
  const [saving, setSaving] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({ name: "", phone: "" });
  const [savingNewPatient, setSavingNewPatient] = useState(false);
  const [newPatientError, setNewPatientError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const patientComboRef = useRef<HTMLDivElement>(null);
  const [chartNotes, setChartNotes] = useState("");
  const [savingChart, setSavingChart] = useState(false);
  const [chartSaved, setChartSaved] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 768) setView("week");
  }, []);

  const dateKey = view === "day"
    ? format(currentDate, "yyyy-MM-dd")
    : format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // Agenda: cache por data+view, atualiza quando muda
  const { data: appointments = [], isLoading: loadingAppointments, mutate: mutateAppointments } = useSWR<any[]>(
    `/api/appointments?date=${dateKey}&view=${view}${selectedDoctorId ? `&doctorId=${selectedDoctorId}` : ""}`,
    fetcher
  );

  // Lista completa de médicos da clínica (para o seletor de admin/recepção)
  const { data: allDoctorsData } = useSWR("/api/doctors", fetcher, { revalidateOnFocus: false });
  const allDoctors: any[] = Array.isArray(allDoctorsData) ? allDoctorsData.filter((d) => d.active) : [];

  // Configurações da clínica: cache longo, não revalida no focus
  const { data: settingsData } = useSWR("/api/settings", fetcher, { revalidateOnFocus: false });
  const clinicSettings = settingsData && !settingsData.error
    ? {
        openingTime: settingsData.openingTime ?? "08:00",
        closingTime: settingsData.closingTime ?? "18:00",
        availableDays: settingsData.availableDays ?? "1,2,3,4,5",
        timezone: settingsData.timezone ?? "America/Sao_Paulo",
      }
    : { openingTime: "08:00", closingTime: "18:00", availableDays: "1,2,3,4,5", timezone: "America/Sao_Paulo" };
  const tz = clinicSettings.timezone;

  // Os agendamentos do bot são armazenados como hora local SP sem conversão de fuso.
  // Usar UTC diretamente evita deslocamento de -3h na exibição.
  const aptTime = (iso: string) => {
    const dt = new Date(iso);
    return `${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}`;
  };

  // Serviços: cache longo
  const { data: servicesData } = useSWR("/api/services", fetcher, { revalidateOnFocus: false });
  const services: any[] = Array.isArray(servicesData) ? servicesData : [];

  // Pacientes: LAZY — só busca quando modal está aberto
  const { data: patientsData, mutate: mutatePatients } = useSWR(showModal ? "/api/patients" : null, fetcher, { revalidateOnFocus: false });
  const patients: any[] = Array.isArray(patientsData) ? patientsData : (patientsData?.data ?? []);

  // Médicos extraídos dos agendamentos
  const doctors = useMemo(() => {
    const seen = new Set<string>();
    return appointments.filter((a) => {
      if (!a.doctor || seen.has(a.doctor.id)) return false;
      seen.add(a.doctor.id);
      return true;
    }).map((a) => a.doctor);
  }, [appointments]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (patientComboRef.current && !patientComboRef.current.contains(e.target as Node)) {
        setPatientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function closeAppointmentModal() {
    setShowModal(false);
    setForm({ patientId: "", serviceId: "", doctorId: "", dateTime: "", insurance: "", notes: "", value: "" });
    setShowNewPatient(false);
    setNewPatientForm({ name: "", phone: "" });
    setNewPatientError(null);
    setPatientSearch("");
    setPatientDropdownOpen(false);
  }

  async function handleSave() {
    setSaving(true);
    const doctorId = selectedDoctorId || (isDoctor ? (session?.user as any)?.doctorId : null) || doctors[0]?.id || allDoctors[0]?.id || appointments[0]?.doctorId;
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, doctorId, value: form.value ? parseFloat(form.value) : null }),
    });
    setSaving(false);
    closeAppointmentModal();
    mutateAppointments();
  }

  async function handleCreateNewPatient() {
    if (!newPatientForm.name.trim() || !newPatientForm.phone.trim()) return;
    setSavingNewPatient(true);
    setNewPatientError(null);
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPatientForm.name, phone: newPatientForm.phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNewPatientError(data.message ?? "Erro ao cadastrar paciente.");
      setSavingNewPatient(false);
      return;
    }
    mutatePatients(
      (cur: any) => ({ data: [...(cur?.data ?? []), data], total: (cur?.total ?? 0) + 1 }),
      false
    );
    setForm((f: any) => ({ ...f, patientId: data.id }));
    setShowNewPatient(false);
    setNewPatientForm({ name: "", phone: "" });
    setSavingNewPatient(false);
  }

  async function saveChartNotes() {
    if (!selectedApt) return;
    setSavingChart(true);
    await fetch(`/api/appointments/${selectedApt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: chartNotes }),
    });
    setSavingChart(false);
    setChartSaved(true);
    setTimeout(() => setChartSaved(false), 2000);
    mutateAppointments();
  }

  useEffect(() => {
    if (selectedApt) setChartNotes(selectedApt.notes ?? "");
  }, [selectedApt?.id]);

  async function handleStatus(id: string, status: string) {
    // Atualiza otimisticamente
    mutateAppointments(
      appointments.map((a) => a.id === id ? { ...a, status } : a),
      false
    );
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutateAppointments();
    setSelectedApt(null);
  }

  const aptSlotMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const a of appointments) {
      const dt = new Date(a.dateTime);
      const dateKey = a.dateTime.split("T")[0];
      const h = String(dt.getUTCHours()).padStart(2, "0");
      const m = dt.getUTCMinutes();
      const slotMin = m < 30 ? "00" : "30";
      const key = `${dateKey}_${h}:${slotMin}`;
      (map[key] ??= []).push(a);
    }
    return map;
  }, [appointments, tz]);

  const getAptForSlot = (hour: string, day?: Date) => {
    const key = `${format(day || currentDate, "yyyy-MM-dd")}_${hour}`;
    return aptSlotMap[key] ?? [];
  };

  const HOURS = useMemo(
    () => buildHours(clinicSettings.openingTime, clinicSettings.closingTime),
    [clinicSettings.openingTime, clinicSettings.closingTime]
  );

  const enabledDays = useMemo(
    () => clinicSettings.availableDays.split(",").map(Number),
    [clinicSettings.availableDays]
  );

  const weekDays = useMemo(() => {
    if (view !== "week") return [currentDate];
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter((_, i) => enabledDays.includes(i + 1));
  }, [view, currentDate, enabledDays]);

  // Cor por médico para distinguir na grade quando há mais de um
  const doctorColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    allDoctors.forEach((d, i) => { m[d.id] = DOCTOR_PALETTE[i % DOCTOR_PALETTE.length]; });
    return m;
  }, [allDoctors]);
  const showDoctorTag = allDoctors.length > 1;

  // Altura de cada linha = maior nº de consultas naquele horário entre os dias visíveis.
  // Aplicada igual na coluna de horas e nas colunas de dias → mantém alinhamento e cresce sem estourar.
  const CARD_H = 58;
  const rowHeights = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of HOURS) {
      let max = 1;
      for (const day of weekDays) max = Math.max(max, getAptForSlot(h, day).length);
      m[h] = max * CARD_H;
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [HOURS, weekDays, aptSlotMap]);

  const handlePrev = () => setCurrentDate(view === "day" ? subDays(currentDate, 1) : subDays(currentDate, 7));
  const handleNext = () => setCurrentDate(view === "day" ? addDays(currentDate, 1) : addDays(currentDate, 7));

  return (
    <div className="flex flex-col h-full">

      {/* ── Header mobile ── */}
      <div className="md:hidden border-b border-border bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={handlePrev} className="w-10 h-10 flex items-center justify-center rounded-xl border border-border active:bg-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="text-center flex-1 mx-3">
            <p className="text-sm font-bold capitalize leading-tight">
              {view === "day"
                ? format(currentDate, "EEEE", { locale: ptBR })
                : `Semana de ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd/MM", { locale: ptBR })}`}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {format(currentDate, view === "day" ? "dd 'de' MMMM 'de' yyyy" : "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </button>
          <button onClick={handleNext} className="w-10 h-10 flex items-center justify-center rounded-xl border border-border active:bg-muted">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-3">
          <div className="flex rounded-lg border border-border overflow-hidden flex-1">
            {(["day", "week"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("flex-1 py-2 text-xs font-semibold transition-colors", view === v ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground")}>
                {v === "day" ? "Dia" : "Semana"}
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-medium border border-border rounded-lg bg-white">Hoje</button>
        </div>
      </div>

      {/* ── Header desktop ── */}
      <div className="hidden md:flex px-6 py-4 border-b border-border bg-white items-center gap-4">
        <div>
          <h1 className="text-base font-bold">Agenda</h1>
          <p className="text-xs text-muted-foreground capitalize">
            {loadingAppointments ? "Carregando..." : format(currentDate, view === "day" ? "EEEE, dd 'de' MMMM 'de' yyyy" : "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isDoctor && allDoctors.length > 1 && (
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white max-w-[170px]"
              title="Filtrar agenda por médico"
            >
              <option value="">Todos os médicos</option>
              {allDoctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["day", "week"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", view === v ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted text-muted-foreground")}>
                {v === "day" ? "Dia" : "Semana"}
              </button>
            ))}
          </div>
          <button onClick={handlePrev} className="p-1.5 hover:bg-muted rounded-lg border border-border"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-medium hover:bg-muted rounded-lg border border-border">Hoje</button>
          <button onClick={handleNext} className="p-1.5 hover:bg-muted rounded-lg border border-border"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90">
            <Plus className="w-3.5 h-3.5" /> Agendar
          </button>
        </div>
      </div>

      {/* ── Grade ── */}
      <div className={cn("flex-1 overflow-auto transition-opacity duration-300", loadingAppointments && "opacity-40 pointer-events-none")}>
        <div className="flex">
          <div className="w-12 md:w-16 flex-shrink-0 border-r border-border sticky left-0 bg-white z-10">
            <div className="h-10 border-b border-border" />
            {HOURS.map((h) => (
              <div key={h} style={{ height: rowHeights[h] }} className="border-b border-border/50 px-1 md:px-2 pt-1">
                <span className="text-[10px] text-muted-foreground">{h}</span>
              </div>
            ))}
          </div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={cn("flex-1 border-r border-border last:border-r-0", view === "week" && "min-w-[110px] md:min-w-[160px]")}>
              <div className={cn("h-10 border-b border-border px-2 md:px-3 flex items-center sticky top-0 bg-white z-10", format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && "bg-blue-50")}>
                <div className="flex flex-col">
                  <span className="text-[11px] md:text-xs font-bold capitalize leading-tight">
                    {format(day, view === "week" ? "EEE" : "EEEE", { locale: ptBR })}
                  </span>
                  {view === "week" && <span className="text-[10px] text-muted-foreground">{format(day, "dd/MM")}</span>}
                </div>
              </div>
              {HOURS.map((h) => {
                const apts = getAptForSlot(h, day);
                return (
                  <div key={h} style={{ height: rowHeights[h] }} className="border-b border-border/50 px-0.5 py-0.5 space-y-0.5 overflow-hidden">
                    {apts.map((apt) => (
                      <button
                        key={apt.id}
                        onClick={() => setSelectedApt(apt)}
                        style={{ height: CARD_H - 4 }}
                        className={cn("w-full text-left rounded px-1.5 md:px-2 py-1 text-[10px] font-medium border transition-all active:opacity-70 overflow-hidden", STATUS_COLORS[apt.status] ?? "bg-slate-100 text-slate-700 border-slate-200")}
                      >
                        <div className="flex items-center gap-1">
                          {STATUS_ICON[apt.status]}
                          <span className="opacity-60 tabular-nums">{aptTime(apt.dateTime)}</span>
                          <span className="truncate font-semibold">{apt.patient?.name}</span>
                        </div>
                        {apt.service && <span className="opacity-70 block truncate">{apt.service.name}</span>}
                        {showDoctorTag && apt.doctor && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: doctorColorMap[apt.doctor.id] ?? "#94a3b8" }} />
                            <span className="truncate opacity-80">{apt.doctor.name.split(" ").slice(0, 2).join(" ")}</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── FAB mobile ── */}
      <button
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-[72px] right-4 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Novo agendamento"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ── Modal de agendamento ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center md:justify-center md:p-4" onClick={closeAppointmentModal}>
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-md max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">Novo Agendamento</h3>
              <button onClick={closeAppointmentModal}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Paciente</label>
                <div ref={patientComboRef} className="relative">
                  <div
                    className={cn(
                      "w-full flex items-center gap-2 text-sm border rounded-xl px-3 py-3 bg-white cursor-pointer",
                      patientDropdownOpen ? "border-primary ring-1 ring-primary" : "border-border"
                    )}
                    onClick={() => { setPatientDropdownOpen((o) => !o); }}
                  >
                    <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      type="text"
                      placeholder={
                        form.patientId
                          ? (patients.find((p: any) => p.id === form.patientId)?.name ?? "Selecionar paciente...")
                          : patients.length === 0 ? "Carregando..." : "Buscar paciente..."
                      }
                      value={patientDropdownOpen ? patientSearch : (patients.find((p: any) => p.id === form.patientId)?.name ?? "")}
                      onChange={(e) => { setPatientSearch(e.target.value); setPatientDropdownOpen(true); }}
                      onFocus={() => { setPatientDropdownOpen(true); setPatientSearch(""); }}
                      className="flex-1 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                    />
                    {form.patientId && !patientDropdownOpen ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setForm({ ...form, patientId: "" }); setPatientSearch(""); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", patientDropdownOpen && "rotate-180")} />
                    )}
                  </div>
                  {patientDropdownOpen && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {patients
                        .filter((p: any) =>
                          !patientSearch || p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone?.includes(patientSearch)
                        )
                        .slice(0, 50)
                        .map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setForm({ ...form, patientId: p.id });
                              setPatientSearch("");
                              setPatientDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors",
                              form.patientId === p.id && "bg-primary/5 font-medium text-primary"
                            )}
                          >
                            <span className="block truncate">{p.name}</span>
                            {p.phone && <span className="text-xs text-muted-foreground">{p.phone}</span>}
                          </button>
                        ))}
                      {patients.filter((p: any) =>
                        !patientSearch || p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone?.includes(patientSearch)
                      ).length === 0 && (
                        <p className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum paciente encontrado</p>
                      )}
                    </div>
                  )}
                </div>
                {!showNewPatient ? (
                  <button
                    type="button"
                    onClick={() => { setShowNewPatient(true); setNewPatientError(null); }}
                    className="mt-1.5 flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Cadastrar novo paciente
                  </button>
                ) : (
                  <div className="mt-2 border border-border rounded-xl p-3 space-y-2.5 bg-muted/20">
                    <p className="text-xs font-semibold text-foreground">Novo paciente</p>
                    <input
                      type="text"
                      placeholder="Nome completo *"
                      value={newPatientForm.name}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="tel"
                      placeholder="Telefone / WhatsApp *"
                      value={newPatientForm.phone}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {newPatientError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{newPatientError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowNewPatient(false); setNewPatientForm({ name: "", phone: "" }); setNewPatientError(null); }}
                        className="flex-1 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateNewPatient}
                        disabled={savingNewPatient || !newPatientForm.name.trim() || !newPatientForm.phone.trim()}
                        className="flex-1 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                      >
                        {savingNewPatient ? "Criando..." : "Criar e selecionar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Serviço</label>
                <select
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                  className="w-full text-sm border border-border rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                >
                  <option value="">Selecionar serviço...</option>
                  {services.filter((s: any) => s.active).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} — R$ {s.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Data e hora</label>
                <input
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                  className="w-full text-sm border border-border rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Convênio</label>
                  <input
                    type="text"
                    placeholder="Particular"
                    value={form.insurance}
                    onChange={(e) => setForm({ ...form, insurance: e.target.value })}
                    className="w-full text-sm border border-border rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    placeholder="250"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full text-sm border border-border rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                O tipo da consulta (consulta, retorno, procedimento) é definido automaticamente pelo serviço escolhido.
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full text-sm border border-border rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button onClick={closeAppointmentModal} className="flex-1 py-3 text-sm font-medium border border-border rounded-xl hover:bg-muted">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.patientId || !form.dateTime}
                className="flex-1 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detalhe da consulta ── */}
      {selectedApt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center md:justify-center md:p-4" onClick={() => setSelectedApt(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <Link href={`/pacientes/${selectedApt.patient?.id}`} className="font-semibold text-sm hover:text-primary hover:underline">
                  {selectedApt.patient?.name}
                </Link>
                <p className="text-xs text-muted-foreground">{aptTime(selectedApt.dateTime)}</p>
              </div>
              <button onClick={() => setSelectedApt(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Link href={`/pacientes/${selectedApt.patient?.id}`} className="flex items-center justify-center gap-1.5 w-full py-2 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors">
                <FileText className="w-3.5 h-3.5" /> Abrir ficha do paciente
              </Link>
              <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span className="font-medium">{selectedApt.service?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Médico</span><span className="font-medium">{selectedApt.doctor?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Convênio</span><span className="font-medium">{selectedApt.insurance || "Particular"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-medium">{selectedApt.value ? `R$ ${selectedApt.value}` : "—"}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[selectedApt.status])}>{STATUS_LABELS[selectedApt.status]}</span>
              </div>

              <div className="pt-3 border-t border-border/60">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5" /> Anotações da consulta
                </label>
                <textarea
                  rows={4}
                  value={chartNotes}
                  onChange={(e) => setChartNotes(e.target.value)}
                  placeholder="Queixa principal, diagnóstico, conduta..."
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <button
                  onClick={saveChartNotes}
                  disabled={savingChart}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  {chartSaved ? "Salvo!" : savingChart ? "Salvando..." : "Salvar anotações"}
                </button>
              </div>
            </div>
            <div className="px-5 pb-5 grid grid-cols-2 gap-2">
              {["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
                <button key={s} onClick={() => handleStatus(selectedApt.id, s)} className={cn("py-3 text-xs font-semibold rounded-xl border transition-colors", STATUS_COLORS[s])}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
