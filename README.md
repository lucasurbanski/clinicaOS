# ClinicaOS — MVP de Gestão para Consultório Médico Privado

Sistema SaaS para gestão comercial, agenda, CRM e relacionamento com pacientes. **Não é prontuário clínico.**

## Como rodar

```bash
cd clinica-saas
npm install
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
npm run dev
```

Acesse: http://localhost:3000

## Credenciais de demo

| Usuário | Email | Senha |
|---|---|---|
| Admin | admin@clinica.com | 123456 |
| Recepção | recepcao@clinica.com | 123456 |

## Telas disponíveis

| Rota | Descrição |
|---|---|
| `/dashboard` | KPIs, agenda do dia, alertas de CRM |
| `/agenda` | Grade diária/semanal, criar/editar agendamentos |
| `/pacientes` | Lista com filtros por perfil comportamental |
| `/pacientes/[id]` | Histórico, linha do tempo, métricas |
| `/crm` | Oportunidades abertas por tipo e prioridade |
| `/bot` | Simulador de agendamento via WhatsApp |
| `/servicos` | CRUD de serviços |
| `/configuracoes` | Dados do consultório e mensagens automáticas |

## Stack

- **Next.js 14** (App Router) — frontend + API routes
- **TypeScript + Tailwind CSS** — UI
- **Prisma + SQLite** — banco de dados local
- **NextAuth.js** — autenticação JWT

## Próximos passos para virar produto real

1. **WhatsApp real** — integrar com Evolution API ou Z-API usando os hooks já estruturados no simulador
2. **PostgreSQL** — trocar SQLite por Postgres (só mudar `DATABASE_URL` e `provider`)
3. **Notificações automáticas** — job que lê CRM e dispara mensagens de reativação
4. **Multi-tenancy** — cada consultório tem seu próprio `clinicId` (já modelado)
5. **Relatórios** — gráficos de receita, churn de pacientes, LTV
6. **App mobile** — React Native reutilizando as APIs
7. **LGPD** — criptografia de dados sensíveis, logs de acesso, exportação/exclusão de dados
