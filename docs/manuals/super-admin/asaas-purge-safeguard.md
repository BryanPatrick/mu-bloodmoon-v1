# Proteção operacional de contas com cobrança Asaas — Fase 5

No ambiente local/sandbox, a prévia de `PRE_BETA_PURGE` deve retornar
`BLOCKED` para qualquer conta que possua `BillingProfile`,
`ProviderCustomer` ou `RechargeIntent` Asaas, mesmo pendente. Não
contorne esse bloqueio com exclusão direta no banco: as relações do
schema ainda incluem `onDelete: Cascade` e poderiam apagar evidências
de cobrança. Use o fluxo normal de exclusão/anônimização para a conta
quando cabível; ele preserva os registros financeiros e o perfil de
cobrança criptografado.

A duração de retenção e a forma de desvincular/descartar esses registros
dependem de decisão de produto e revisão jurídica. Não há prazo
configurado nem autorização implícita para apagá-los.

Nenhuma chamada real à Asaas ou mudança de produção ocorreu nesta fase.
