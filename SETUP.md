# ClinicaOS — Setup pro Lucas

Pacote enviado em 2026-05-25. Tudo que você precisa pra rodar local e fazer deploy.

---

## 1. Extrair

Extrai o zip pra qualquer pasta sua. Sugestão:
```
C:\Users\lucas\Documents\AgenteIA\frontend
```

---

## 2. Instalar dependências (5 min)

```powershell
cd C:\Users\lucas\Documents\AgenteIA\frontend
npm install
npx prisma generate
```

---

## 3. Rodar local

```powershell
npm run dev -- --port 3001
```

Acessa: http://localhost:3001

**Login demo:**
- `admin@clinica.com` / `123456`
- `recepcao@clinica.com` / `123456`

> O `.env` já vem configurado apontando pro Postgres de produção (`quietcicada-postgres.cloudfy.live:8597`, schema `clinicaos`). Você vai mexer no MESMO banco que tá no ar. Se preferir banco local, troca o `DATABASE_URL` e roda `npx prisma db push` + `npx prisma db seed`.

---

## 4. Deploy no Vercel

### Setup inicial (uma vez só)

```powershell
npm i -g vercel
$env:VERCEL_TOKEN="vcp_6o52ATTb6I2Kb9QWe06fZmu4hBfy1xzUfteRyF5igKqELf5tBp46tRN8"
vercel link --yes --project clinica-saas --scope clinica-os --token $env:VERCEL_TOKEN
```

### Toda vez que quiser subir

```powershell
$env:VERCEL_TOKEN="vcp_6o52ATTb6I2Kb9QWe06fZmu4hBfy1xzUfteRyF5igKqELf5tBp46tRN8"
vercel --prod --yes --token $env:VERCEL_TOKEN
```

**Dica:** pra não digitar o token toda vez, coloca no seu perfil do PowerShell:
```powershell
notepad $PROFILE
# adiciona: $env:VERCEL_TOKEN="vcp_6o52ATTb..."
```

**URL produção:** https://clinica-saas-clinica-os.vercel.app

---

## 5. Stack do projeto

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Prisma + PostgreSQL** (schema `clinicaos`)
- **NextAuth.js** (JWT, CredentialsProvider)
- Models: Clinic, User, Doctor, Patient, Appointment, Service, ServicePricing, InsurancePlan, InsurancePlanService, PatientInteraction, PatientTag, CRMOpportunity, BotConversation

**IMPORTANTE — auth pattern:**
Todas as APIs precisam usar `src/lib/getClinicId.ts` (busca clinicId fresco do banco pelo userId da sessão) em vez de `(session.user as any).clinicId`. O valor no JWT é stale.

---

## 6. Telas prontas

| Rota | Status |
|---|---|
| /dashboard | KPIs, agenda do dia, alertas |
| /agenda | Grade diária/semanal |
| /pacientes | Lista + modal de cadastro |
| /pacientes/[id] | Histórico, linha do tempo |
| /crm | Oportunidades abertas, filtros |
| /bot | Simulador WhatsApp (9 etapas) |
| /servicos | CRUD + preços por forma de pagamento |
| /convenios | CRUD de planos |
| /configuracoes | Dados consultório + mensagens automáticas |
| /automacoes | Webhooks n8n, payloads JSON |

---

## 7. Próximos passos (backlog)

1. Endpoints `/api/v1/` protegidos por API key (pro n8n consumir)
2. Model `WebhookEvent` no schema — histórico real de eventos
3. Lib `src/lib/events.ts` — dispatcher central que envia webhook
4. Disparar eventos reais nos PATCH de appointments / POST de patients
5. Gráficos no dashboard (Recharts: receita por mês, pacientes novos vs. inativos)
6. Classificação automática de perfil comportamental (job periódico)

---

## ⚠️ Segurança

Esse zip contém:
- Senha do Postgres de produção (`.env` e `DATABASE.txt`)
- Token Vercel com escopo `clinica-os` (esse arquivo)

**Não commita esse zip, não joga em Drive público, não compartilha com terceiros.** Se vazar, avisa o Eliel imediatamente pra revogar o token em https://vercel.com/account/tokens.
