import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Clinic ────────────────────────────────────────────────────────────────
  const clinic = await prisma.clinic.create({
    data: {
      name: "Consultório Dr. Rodrigo Alves",
      phone: "(11) 98765-4321",
      email: "contato@drrodrigoalves.com.br",
      address: "Rua das Flores, 123 - Jardins, São Paulo/SP",
      openingTime: "08:00",
      closingTime: "18:00",
      availableDays: "1,2,3,4,5",
      defaultDuration: 30,
      intervalBetween: 10,
      confirmationMessage: "Olá, {nome}! Lembrando que sua consulta de {servico} com {medico} está marcada para {data} às {hora}. Confirme sua presença respondendo SIM ou cancele respondendo NÃO.",
      reminder12hMessage: "Olá, {nome}! Ainda não recebemos sua confirmação. Sua consulta de {servico} com {medico} é hoje às {hora}. Confirme com SIM ou cancele com NÃO.",
      reminderMessage: "Olá, {nome}! Lembrete: sua consulta de {servico} com {medico} começa em aproximadamente 1 hora, às {hora}. Até logo!",
      reactivationMessage: "Olá {nome}! Sentimos sua falta! Temos horários disponíveis esta semana. Quer agendar?",
    },
  });

  // ── Doctor ────────────────────────────────────────────────────────────────
  const doctor = await prisma.doctor.create({
    data: {
      name: "Dr. Rodrigo Alves",
      specialty: "Clínica Geral",
      crm: "CRM/SP 123456",
      phone: "(11) 98765-4321",
      email: "rodrigo@drrodrigoalves.com.br",
      clinicId: clinic.id,
    },
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.user.createMany({
    data: [
      {
        name: "Dr. Rodrigo Alves",
        email: "admin@clinica.com",
        password: hashedPassword,
        role: "ADMIN",
        clinicId: clinic.id,
      },
      {
        name: "Ana Recepcionista",
        email: "recepcao@clinica.com",
        password: hashedPassword,
        role: "RECEPTIONIST",
        clinicId: clinic.id,
      },
    ],
  });

  // ── Services ──────────────────────────────────────────────────────────────
  const [svcConsulta, svcRetorno, svcAvaliacao, svcProcedimento] = await Promise.all([
    prisma.service.create({ data: { name: "Consulta", duration: 30, value: 250, type: "CONSULTATION", description: "Consulta clínica geral", clinicId: clinic.id } }),
    prisma.service.create({ data: { name: "Retorno", duration: 20, value: 120, type: "RETURN", description: "Consulta de retorno", clinicId: clinic.id } }),
    prisma.service.create({ data: { name: "Avaliação Completa", duration: 60, value: 400, type: "CONSULTATION", description: "Avaliação clínica completa com exames", clinicId: clinic.id } }),
    prisma.service.create({ data: { name: "Procedimento Ambulatorial", duration: 45, value: 350, type: "PROCEDURE", description: "Procedimento ambulatorial simples", clinicId: clinic.id } }),
  ]);

  // ── Patients + History ────────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);

  // Paciente 1 — Alto valor, recorrente
  const p1 = await prisma.patient.create({
    data: {
      name: "Maria Fernanda Costa",
      phone: "(11) 99100-2233",
      email: "mariafernanda@email.com",
      birthDate: new Date("1980-03-15"),
      insurance: "Particular",
      origin: "Indicação",
      firstConsultDate: daysAgo(400),
      lastConsultDate: daysAgo(28),
      totalSpent: 1850,
      totalAppointments: 7,
      avgReturnDays: 55,
      profile: "HIGH_VALUE",
      clinicId: clinic.id,
      notes: "Paciente pontual, prefere horários pela manhã",
    },
  });

  // Paciente 2 — Inativo (mais de 90 dias)
  const p2 = await prisma.patient.create({
    data: {
      name: "Carlos Eduardo Mendes",
      phone: "(11) 98877-6655",
      email: "carlos.mendes@email.com",
      birthDate: new Date("1975-08-22"),
      insurance: "Unimed",
      origin: "Google",
      firstConsultDate: daysAgo(300),
      lastConsultDate: daysAgo(110),
      totalSpent: 620,
      totalAppointments: 3,
      avgReturnDays: 95,
      profile: "INACTIVE",
      clinicId: clinic.id,
    },
  });

  // Paciente 3 — Novo paciente
  const p3 = await prisma.patient.create({
    data: {
      name: "Juliana Rodrigues",
      phone: "(11) 97766-5544",
      email: "juliana.r@email.com",
      birthDate: new Date("1995-12-01"),
      insurance: "Particular",
      origin: "Instagram",
      firstConsultDate: daysAgo(15),
      lastConsultDate: daysAgo(15),
      totalSpent: 250,
      totalAppointments: 1,
      avgReturnDays: null,
      profile: "NEW",
      clinicId: clinic.id,
    },
  });

  // Paciente 4 — Retorno pendente
  const p4 = await prisma.patient.create({
    data: {
      name: "Roberto Santana",
      phone: "(11) 96655-4433",
      email: "roberto.s@email.com",
      birthDate: new Date("1968-05-10"),
      insurance: "Bradesco Saúde",
      origin: "Indicação",
      firstConsultDate: daysAgo(180),
      lastConsultDate: daysAgo(65),
      totalSpent: 990,
      totalAppointments: 4,
      avgReturnDays: 45,
      profile: "PENDING_RETURN",
      clinicId: clinic.id,
      notes: "Paciente com hipertensão, retorno de 60 em 60 dias",
    },
  });

  // Paciente 5 — Recorrente fiel
  const p5 = await prisma.patient.create({
    data: {
      name: "Ana Paula Silveira",
      phone: "(11) 95544-3322",
      email: "anapaula@email.com",
      birthDate: new Date("1988-07-19"),
      insurance: "Particular",
      origin: "Indicação",
      firstConsultDate: daysAgo(520),
      lastConsultDate: daysAgo(35),
      totalSpent: 3200,
      totalAppointments: 12,
      avgReturnDays: 42,
      profile: "HIGH_VALUE",
      clinicId: clinic.id,
    },
  });

  // Paciente 6 — Convênio, recorrente
  const p6 = await prisma.patient.create({
    data: {
      name: "Marcos Vinícius Lima",
      phone: "(11) 94433-2211",
      email: "marcos.lima@email.com",
      birthDate: new Date("1990-02-28"),
      insurance: "Amil",
      origin: "Indicação médica",
      firstConsultDate: daysAgo(240),
      lastConsultDate: daysAgo(45),
      totalSpent: 480,
      totalAppointments: 4,
      avgReturnDays: 60,
      profile: "RECURRING",
      clinicId: clinic.id,
    },
  });

  // Paciente 7 — Em risco (inativo quase)
  const p7 = await prisma.patient.create({
    data: {
      name: "Fernanda Oliveira",
      phone: "(11) 93322-1100",
      email: "fernanda.o@email.com",
      birthDate: new Date("1982-11-05"),
      insurance: "Particular",
      origin: "Google",
      firstConsultDate: daysAgo(150),
      lastConsultDate: daysAgo(80),
      totalSpent: 750,
      totalAppointments: 3,
      avgReturnDays: 50,
      profile: "AT_RISK",
      clinicId: clinic.id,
    },
  });

  // Paciente 8 — Novo, segunda consulta
  const p8 = await prisma.patient.create({
    data: {
      name: "Pedro Henrique Barros",
      phone: "(11) 92211-0099",
      email: "pedro.barros@email.com",
      birthDate: new Date("2000-06-14"),
      insurance: "Sulamerica",
      origin: "Instagram",
      firstConsultDate: daysAgo(25),
      lastConsultDate: daysAgo(10),
      totalSpent: 370,
      totalAppointments: 2,
      avgReturnDays: 15,
      profile: "NEW",
      clinicId: clinic.id,
    },
  });

  // Paciente 9 — Alto valor, inativo
  const p9 = await prisma.patient.create({
    data: {
      name: "Lucia Aparecida Moura",
      phone: "(11) 91100-9988",
      email: "lucia.moura@email.com",
      birthDate: new Date("1955-04-30"),
      insurance: "Particular",
      origin: "Indicação",
      firstConsultDate: daysAgo(730),
      lastConsultDate: daysAgo(120),
      totalSpent: 4800,
      totalAppointments: 18,
      avgReturnDays: 40,
      profile: "INACTIVE",
      clinicId: clinic.id,
      notes: "Paciente longa data, alto valor. Não retorna há 4 meses.",
    },
  });

  // Paciente 10 — Novo hoje
  const p10 = await prisma.patient.create({
    data: {
      name: "Gabriel Torres",
      phone: "(11) 90099-8877",
      email: "gabriel.torres@email.com",
      birthDate: new Date("1997-09-23"),
      insurance: "Particular",
      origin: "Indicação",
      firstConsultDate: daysAgo(3),
      lastConsultDate: daysAgo(3),
      totalSpent: 250,
      totalAppointments: 1,
      profile: "NEW",
      clinicId: clinic.id,
    },
  });

  // ── Tags ──────────────────────────────────────────────────────────────────
  await prisma.patientTag.createMany({
    data: [
      { patientId: p1.id, tag: "Alto Valor" },
      { patientId: p1.id, tag: "Indicadora" },
      { patientId: p2.id, tag: "Convênio" },
      { patientId: p2.id, tag: "Inativo" },
      { patientId: p3.id, tag: "Novo" },
      { patientId: p3.id, tag: "Instagram" },
      { patientId: p4.id, tag: "Retorno Pendente" },
      { patientId: p4.id, tag: "Crônico" },
      { patientId: p5.id, tag: "Alto Valor" },
      { patientId: p5.id, tag: "VIP" },
      { patientId: p6.id, tag: "Convênio" },
      { patientId: p7.id, tag: "Em Risco" },
      { patientId: p9.id, tag: "Alto Valor" },
      { patientId: p9.id, tag: "Inativo" },
      { patientId: p9.id, tag: "Reativar" },
    ],
  });

  // ── Appointments (passados e futuros) ─────────────────────────────────────
  const setTime = (date: Date, h: number, m: number) => {
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const todayAt = (h: number, m: number) => setTime(new Date(), h, m);

  await prisma.appointment.createMany({
    data: [
      // Hoje
      { patientId: p1.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: todayAt(8, 30), status: "CONFIRMED", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p5.id, doctorId: doctor.id, serviceId: svcRetorno.id, clinicId: clinic.id, dateTime: todayAt(9, 10), status: "CONFIRMED", type: "RETURN", value: 120, isReturn: true, duration: 20 },
      { patientId: p8.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: todayAt(10, 0), status: "PENDING", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p3.id, doctorId: doctor.id, serviceId: svcRetorno.id, clinicId: clinic.id, dateTime: todayAt(11, 0), status: "CONFIRMED", type: "RETURN", value: 120, isReturn: true, duration: 20 },
      { patientId: p6.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: todayAt(14, 0), status: "PENDING", type: "CONSULTATION", insurance: "Amil", value: 0, isReturn: false, duration: 30 },
      { patientId: p10.id, doctorId: doctor.id, serviceId: svcRetorno.id, clinicId: clinic.id, dateTime: todayAt(15, 30), status: "PENDING", type: "RETURN", value: 120, isReturn: true, duration: 20 },
      // Próximos dias
      { patientId: p4.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: setTime(daysFromNow(1), 9, 0), status: "CONFIRMED", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p5.id, doctorId: doctor.id, serviceId: svcAvaliacao.id, clinicId: clinic.id, dateTime: setTime(daysFromNow(2), 10, 0), status: "CONFIRMED", type: "CONSULTATION", value: 400, isReturn: false, duration: 60 },
      { patientId: p7.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: setTime(daysFromNow(3), 9, 30), status: "PENDING", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p1.id, doctorId: doctor.id, serviceId: svcProcedimento.id, clinicId: clinic.id, dateTime: setTime(daysFromNow(5), 14, 0), status: "CONFIRMED", type: "PROCEDURE", value: 350, isReturn: false, duration: 45 },
      // Passados (histórico)
      { patientId: p1.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(28), status: "COMPLETED", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p1.id, doctorId: doctor.id, serviceId: svcRetorno.id, clinicId: clinic.id, dateTime: daysAgo(90), status: "COMPLETED", type: "RETURN", value: 120, isReturn: true, duration: 20 },
      { patientId: p2.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(110), status: "COMPLETED", type: "CONSULTATION", insurance: "Unimed", value: 0, isReturn: false, duration: 30 },
      { patientId: p2.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(200), status: "COMPLETED", type: "CONSULTATION", insurance: "Unimed", value: 0, isReturn: false, duration: 30 },
      { patientId: p4.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(65), status: "COMPLETED", type: "CONSULTATION", insurance: "Bradesco Saúde", value: 0, isReturn: false, duration: 30 },
      { patientId: p5.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(35), status: "COMPLETED", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p5.id, doctorId: doctor.id, serviceId: svcRetorno.id, clinicId: clinic.id, dateTime: daysAgo(77), status: "COMPLETED", type: "RETURN", value: 120, isReturn: true, duration: 20 },
      { patientId: p9.id, doctorId: doctor.id, serviceId: svcAvaliacao.id, clinicId: clinic.id, dateTime: daysAgo(120), status: "COMPLETED", type: "CONSULTATION", value: 400, isReturn: false, duration: 60 },
      { patientId: p9.id, doctorId: doctor.id, serviceId: svcRetorno.id, clinicId: clinic.id, dateTime: daysAgo(160), status: "COMPLETED", type: "RETURN", value: 120, isReturn: true, duration: 20 },
      { patientId: p3.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(15), status: "COMPLETED", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p7.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(80), status: "COMPLETED", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p7.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(130), status: "NO_SHOW", type: "CONSULTATION", value: 250, isReturn: false, duration: 30 },
      { patientId: p6.id, doctorId: doctor.id, serviceId: svcConsulta.id, clinicId: clinic.id, dateTime: daysAgo(45), status: "COMPLETED", type: "CONSULTATION", insurance: "Amil", value: 0, isReturn: false, duration: 30 },
    ],
  });

  // ── Interactions ──────────────────────────────────────────────────────────
  await prisma.patientInteraction.createMany({
    data: [
      { patientId: p1.id, type: "APPOINTMENT", description: "Consulta realizada — pressão arterial e exames gerais", value: 250, date: daysAgo(28) },
      { patientId: p1.id, type: "RETURN", description: "Retorno para resultado de exames", value: 120, date: daysAgo(90) },
      { patientId: p1.id, type: "NOTE", description: "Paciente pediu indicação de cardiologista", date: daysAgo(27) },
      { patientId: p2.id, type: "APPOINTMENT", description: "Consulta de rotina — convênio Unimed", value: 0, date: daysAgo(110) },
      { patientId: p2.id, type: "CANCELLATION", description: "Cancelou consulta de retorno com 1h de antecedência", date: daysAgo(75) },
      { patientId: p3.id, type: "APPOINTMENT", description: "Primeira consulta — queixa de dores de cabeça frequentes", value: 250, date: daysAgo(15) },
      { patientId: p4.id, type: "APPOINTMENT", description: "Acompanhamento hipertensão — ajuste de medicação", value: 0, date: daysAgo(65) },
      { patientId: p5.id, type: "APPOINTMENT", description: "Consulta de rotina anual", value: 250, date: daysAgo(35) },
      { patientId: p7.id, type: "NO_SHOW", description: "Paciente não compareceu e não avisou", date: daysAgo(130) },
      { patientId: p7.id, type: "APPOINTMENT", description: "Consulta remarcada após falta anterior", value: 250, date: daysAgo(80) },
      { patientId: p9.id, type: "APPOINTMENT", description: "Avaliação completa anual", value: 400, date: daysAgo(120) },
      { patientId: p9.id, type: "MESSAGE", description: "Enviada mensagem de reativação — sem resposta", date: daysAgo(90) },
    ],
  });

  // ── CRM Opportunities ─────────────────────────────────────────────────────
  await prisma.cRMOpportunity.createMany({
    data: [
      {
        patientId: p2.id,
        clinicId: clinic.id,
        type: "REACTIVATION",
        reason: "Sem consulta há 110 dias",
        suggestedAction: "Enviar mensagem personalizada de reativação",
        priority: "HIGH",
        status: "OPEN",
      },
      {
        patientId: p9.id,
        clinicId: clinic.id,
        type: "REACTIVATION",
        reason: "Paciente de alto valor sem consulta há 120 dias",
        suggestedAction: "Ligação pessoal do médico + oferta de avaliação completa",
        priority: "HIGH",
        status: "OPEN",
      },
      {
        patientId: p4.id,
        clinicId: clinic.id,
        type: "PENDING_RETURN",
        reason: "Última consulta há 65 dias, retorno esperado em 60 dias",
        suggestedAction: "Confirmar agendamento de retorno",
        priority: "MEDIUM",
        status: "OPEN",
      },
      {
        patientId: p7.id,
        clinicId: clinic.id,
        type: "PENDING_RETURN",
        reason: "Sem retorno há 80 dias, histórico de falta",
        suggestedAction: "Enviar lembrete de retorno com opção de reagendamento fácil",
        priority: "MEDIUM",
        status: "OPEN",
      },
      {
        patientId: p3.id,
        clinicId: clinic.id,
        type: "NEW_PATIENT_FOLLOW_UP",
        reason: "Novo paciente — primeira consulta há 15 dias",
        suggestedAction: "Enviar mensagem de acompanhamento pós-consulta",
        priority: "HIGH",
        status: "OPEN",
      },
      {
        patientId: p5.id,
        clinicId: clinic.id,
        type: "COMPLEMENTARY_SERVICE",
        reason: "Paciente VIP com alta frequência — candidata a avaliação completa",
        suggestedAction: "Oferecer pacote de avaliação completa anual",
        priority: "LOW",
        status: "OPEN",
      },
      {
        patientId: p1.id,
        clinicId: clinic.id,
        type: "HIGH_VALUE_FOLLOW_UP",
        reason: "Paciente indicadora de alto valor",
        suggestedAction: "Agradecer indicações e oferecer agendamento prioritário",
        priority: "LOW",
        status: "OPEN",
      },
    ],
  });

  console.log("✅ Seed concluído com sucesso!");
  console.log("\n📧 Credenciais de acesso:");
  console.log("   Admin:       admin@clinica.com  / 123456");
  console.log("   Recepção:    recepcao@clinica.com / 123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
