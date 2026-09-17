---
status: SECOND_PASS_COMPLETE
category: legacy
audience: internal (engineering + security)
lastVerified: 2026-08-31
confidence: CONFIRMED (real source read)
---

# Legacy provider-web — payment gateways

Blood Moon's own payment architecture (Portal → Order → Payment →
Mercado Pago → Delivery → Ledger) is the sole active source of truth —
see `docs/payments/payment-surfaces-comparison.md`. Everything below is
historical reference: what the legacy panel integrated, and how well (or
poorly) each callback was actually verified, useful context for security
review of the *current* payment surface but not itself in scope for
integration.

## Two generations of gateway integration

**Newer, plugin-architecture gateways** (`plugins/`): `gerencianet` (PIX
— already documented in the first-pass investigation, writes to its own
`DmN_Donate_Gerencianet_*` tables, never touches the mystery `PixPayments`
GameServer table), `mercadopago`, `xendit`, `coinbase`, `binance`,
`stripe`, `paghiper`, `nganluong`. Not deep-dived beyond confirming
presence and that each follows the same plugin-install pattern (own
`sql_schemes/`, own tables).

**Older, base-application-built-in gateways**
(`controllers/controller.payment.php`, `models/model.donate.php`) — these
predate the plugin system:

| Gateway | Callback verification | Assessment |
|---|---|---|
| PayPal | Server-verifies via a curl **postback-to-PayPal** IPN round trip (SSL peer/host verification enabled), plus order-number/buyer-email match | Legitimate IPN pattern |
| PayCall | `verifiedTransaction()` API round-trip + `business_code` config match | Reasonable |
| PaymentWall | Vendor `Paymentwall_Pingback::validate()` (proper signature check) | Legitimate |
| 2CheckOut | Vendor `Twocheckout`/INS library's `check()` against `private_secret_word`, requires `response_code == 'Success'` | Legitimate |
| Interkassa | Vendor `Interkassa_Shop::receiveStatus()` with a configured `secret_key` (HMAC-based) | Legitimate |
| PagSeguro | Does **not** trust the POST body — takes only `notificationCode`, calls `PagSeguroNotificationService::checkTransaction()` (a real API lookup) for the authoritative status | Legitimate |
| Fortumo | `fortumo_sig_check()` recomputes an MD5 signature over sorted params + a per-server secret | Legitimate signature check, but the IP-allowlist that used to additionally gate this endpoint is commented out — signature is now the *only* control |
| **CuentaDigital** | `get_cuenta_digital_order_data($_REQUEST['codigo'])` just looks up the caller-supplied `codigo` in `DmN_Donate_CuentaDigital_Orders` and, if found and unprocessed, credits the account | **No cryptographic verification at all** — no HMAC/signature, no server-to-server confirmation call back to CuentaDigital. Anyone who obtains or guesses a valid order hash can call this endpoint directly and get credited. Weakest of the built-in gateways. |
| **Paygol** | Relies **solely** on an IP allowlist (`in_array(ip(), [3 hardcoded IPs])`) — no signature at all | Trivially bypassable — see [`security-findings.md`](security-findings.md)'s `ip()` header-trust finding, which defeats this exact allowlist |

## Referral bonus applies across every built-in gateway

`controller.payment.php`'s gateway handlers each call
`Mdonate->findReferral($account)` after a successful donation credit,
paying a `referral_config|reward_on_donation` percentage bonus to the
referrer if a referral link exists. This runs for PayPal, PagSeguro,
PayCall, Fortumo, and CuentaDigital alike — meaning the CuentaDigital
weakness above (an attacker crediting their own account via a guessed
order hash) could also trigger a referral payout to a colluding second
account, compounding the impact of that specific gap.

Referral tables found: `DmN_Refferals`, `DmN_Refferal_Reward_List`,
`DmN_Refferal_Claimed_Rewards`. Self-referral abuse control
(`check_referral_ips()`) cross-references `DmN_IP_Log` — which, per
[`database-mapping.md`](database-mapping.md), may not actually have been
populated on ordinary logins in this snapshot (its writer call is
commented out), meaning this specific abuse control may have been
silently non-functional even if this panel had been live.

## PixPayments is unrelated to any of this

None of the gateways above, old or new generation, ever reference the
GameServer's own `PixPayments` table — confirmed via exhaustive search.
That table's writer remains genuinely unresolved; it is not this panel's
Gerencianet PIX plugin (which writes exclusively to its own
`DmN_Donate_Gerencianet_*` tables) or any other gateway found here.
`PixPayments` stays classified `DORMANT_LEGACY_UNKNOWN_WRITER` /
`PRESERVE_DORMANT` per Phase L Decision Closure Decision 4.
