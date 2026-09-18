# Asaas — operação administrativa (Fase 7, ainda não implantada)

O painel Financeiro mostra detalhes por provedor e a ação **Ressincronizar com provedor**. Para uma recarga Asaas `RECONCILE_REQUIRED`, essa ação consulta o Asaas pela referência já gravada, mesmo sem ID externo, e não cria outra cobrança. Se o provedor não encontrar uma cobrança inequívoca, a pendência permanece; não force status PAGO nem faça crédito manual. Registre a investigação e escale ao operador financeiro.

O relatório de reconciliação deve evidenciar `ASAAS_RECONCILE_REQUIRED`, `STUCK_NON_TERMINAL` e `PAID_WITHOUT_LEDGER_CREDIT`. A desativação de novas cobranças não autoriza desligar automaticamente webhook/resync para pagamentos já existentes. Veja o [runbook de prontidão](../../payments/asaas-production-readiness.md) para flags, incidente, retenção pendente e aprovação futura. Nenhuma dessas ações foi executada em produção nesta fase.
