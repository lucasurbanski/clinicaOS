"use client";
import { useEffect, useState } from "react";

// Seletor de médico responsável — usado quando ADMIN/SUPER_ADMIN cria um
// prontuário/receita (o médico responsável precisa ser atribuído p/ o isolamento).
export default function DoctorSelect({
  value, onChange, label = "Médico responsável",
}: { value: string; onChange: (id: string) => void; label?: string }) {
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const actives = (Array.isArray(d) ? d : []).filter((x) => x.active);
        setDoctors(actives);
        if (!value && actives.length === 1) onChange(actives[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-primary bg-white">
        <option value="">Selecione o médico...</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ""}</option>
        ))}
      </select>
    </div>
  );
}
