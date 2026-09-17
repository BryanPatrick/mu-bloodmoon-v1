import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// Versioned billing-PII encryption. Deliberately mirrors the existing,
// already-tested TwoFactorService keyring pattern
// (apps/api/src/modules/auth/two-factor.service.ts) rather than inventing
// a competing convention: per-version key env vars
// (BILLING_PII_KEY_B64 for v1 -- unchanged name, so any already-deployed
// sandbox config keeps working -- BILLING_PII_KEY_V2, ...), an
// ACTIVE_KEY_VERSION env var selecting what new writes use, and a
// self-describing envelope so decrypt() never needs to be told which
// version a value was written under.
//
// Two differences from the 2FA scheme, both deliberate:
//
// 1. Envelope format version is a SEPARATE field from key version
//    (`format.keyVersion.nonce.tag.ciphertext`, 5 dot-joined parts) --
//    2FA conflates "was this written under the old unversioned scheme"
//    with "which key version" via segment count alone (3 parts = legacy
//    v1, 4 parts = versioned). Billing keeps that same legacy detection
//    (the CURRENT, pre-this-change format is `v1.iv.tag.ciphertext`, 4
//    parts, decrypted below as format=1/keyVersion=v1) but makes the
//    format number explicit going forward, so serialization can evolve
//    later without overloading segment count as the only signal.
//
// 2. Key loading stays exactly as strict as billing's original scheme
//    was (an already-random 32-byte key, base64-encoded, checked for
//    exact length) for every version, not 2FA's SHA-256-hash-of-any-
//    string fallback -- billing's v1 never had that looser convention
//    to preserve, so there is no reason to introduce it now.
const ENVELOPE_FORMAT = 1
const KEY_VERSION_PATTERN = /^v[1-9][0-9]{0,3}$/

export class BillingKeyNotConfiguredError extends Error {
	constructor(envVarName: string) {
		super(`${envVarName} is required and must be configured`)
		this.name = 'BillingKeyNotConfiguredError'
	}
}

export class BillingEnvelopeInvalidError extends Error {
	constructor(reason: string) {
		super(`billing PII envelope invalid: ${reason}`)
		this.name = 'BillingEnvelopeInvalidError'
	}
}

function envVarNameForVersion(version: string): string {
	return version === 'v1' ? 'BILLING_PII_KEY_B64' : `BILLING_PII_KEY_${version.toUpperCase()}_B64`
}

function keyForVersion(version: string): Buffer {
	if (!KEY_VERSION_PATTERN.test(version)) {
		throw new BillingEnvelopeInvalidError(`unrecognized key version format: ${JSON.stringify(version)}`)
	}
	const envVarName = envVarNameForVersion(version)
	const encoded = process.env[envVarName] || ''
	const key = Buffer.from(encoded, 'base64')
	if (key.length !== 32) throw new BillingKeyNotConfiguredError(envVarName)
	return key
}

export function activeKeyVersion(): string {
	const configured = process.env.BILLING_PII_ACTIVE_KEY_VERSION || 'v1'
	if (!KEY_VERSION_PATTERN.test(configured)) {
		throw new BillingEnvelopeInvalidError(`BILLING_PII_ACTIVE_KEY_VERSION is not a valid version: ${JSON.stringify(configured)}`)
	}
	return configured
}

/**
 * AAD binds three things, not just the account: the account (so
 * ciphertext can't move between accounts), the field identity (so
 * cpfCnpjCiphertext and legalNameCiphertext, encrypted under the exact
 * same key and account, can never be swapped and still authenticate --
 * the real gap in the pre-existing implementation, which used
 * `accountId` alone as AAD), and a schema/context tag ("billing-profile")
 * so this same key/account/field combination can never be confused with
 * an unrelated envelope elsewhere in the codebase that happened to reuse
 * the same account id and field name.
 */
function aad(accountId: string, fieldName: string): Buffer {
	return Buffer.from(`billing-profile:${accountId}:${fieldName}`, 'utf8')
}

/** Encrypts one named field's value under the currently active key version. */
export function sealField(value: string, accountId: string, fieldName: string): string {
	const version = activeKeyVersion()
	const key = keyForVersion(version)
	const nonce = randomBytes(12)
	const cipher = createCipheriv('aes-256-gcm', key, nonce)
	cipher.setAAD(aad(accountId, fieldName))
	const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
	const parts = [nonce, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url'))
	return [String(ENVELOPE_FORMAT), version, ...parts].join('.')
}

/**
 * Decrypts a named field's value. Rejects (fails closed) on: an
 * unparseable envelope, a missing/misconfigured key for the version the
 * envelope claims, or -- because of AAD -- a wrong accountId, a wrong
 * fieldName, or genuinely tampered ciphertext/nonce/tag. There is no
 * fallback key: an auth failure under the correct key for the claimed
 * version is never retried under a different one.
 */
export function openField(envelope: string, accountId: string, fieldName: string): string {
	const segments = envelope.split('.')
	// Legacy shape (pre-this-change): `v1.nonce.tag.ciphertext`, 4 parts,
	// no explicit format field -- implicitly format=1, keyVersion=v1.
	const [format, version, nonceValue, tagValue, ciphertextValue] =
		segments.length === 5
			? segments
			: segments.length === 4
				? [String(ENVELOPE_FORMAT), ...segments]
				: []
	if (!format || !version || !nonceValue || !tagValue || !ciphertextValue) {
		throw new BillingEnvelopeInvalidError('wrong number of segments')
	}
	if (format !== String(ENVELOPE_FORMAT)) {
		throw new BillingEnvelopeInvalidError(`unsupported envelope format: ${format}`)
	}
	const key = keyForVersion(version)
	const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(nonceValue, 'base64url'))
	decipher.setAAD(aad(accountId, fieldName))
	decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
	// A wrong key, wrong AAD (account/field swap), or tampered
	// nonce/tag/ciphertext all surface here as GCM auth-tag verification
	// failure -- node:crypto throws, this function does not catch it, so
	// the caller never receives a plaintext for a value that didn't
	// authenticate.
	return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8')
}

/** The key version a given envelope was actually written under -- lets re-encryption tooling find not-yet-migrated records without decrypting them. */
export function keyVersionOf(envelope: string): string {
	const segments = envelope.split('.')
	return segments.length === 5 ? segments[1]! : 'v1'
}
