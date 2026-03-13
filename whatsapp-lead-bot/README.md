# 🤖 WhatsApp Lead Bot

Bot inteligente de captura y conversión de leads por WhatsApp para CIRE Depilación Láser.

## Stack
- **Next.js** (App Router) en Vercel
- **Supabase** (base de datos multi-tenant)
- **360Dialog** (WhatsApp API oficial de Meta)
- **Claude API** (IA conversacional)

## Configuración

### Variables de entorno (configurar en Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DIALOG_API_KEY=tu-api-key
DIALOG_API_URL=https://waba.360dialog.io/v1
ANTHROPIC_API_KEY=sk-ant-...
WEBHOOK_VERIFY_TOKEN=tu-token-secreto
```

### Webhook de 360Dialog
Apuntar a: `https://tu-dominio.vercel.app/api/webhook/whatsapp`

## Estructura
```
app/
  api/
    webhook/whatsapp/   → Recibe mensajes de WhatsApp
    dashboard/stats/    → Métricas del embudo
  page.js               → Página de status
lib/
  supabase.js           → Cliente de base de datos
  whatsapp.js           → Envío de mensajes por 360Dialog
  claude.js             → IA conversacional
```
