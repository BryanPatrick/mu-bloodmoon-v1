#!/usr/bin/env node
// Lightweight docs/knowledge/ self-check. No dependencies, no network.
// Mirrors context/validate.mjs's style and scope for consistency. Checks:
// broken relative links, missing/unknown frontmatter, secret-shaped
// strings, duplicate GAP-* ids, PROCEDURE_INDEX rows whose Domain isn't a
// known TOPIC_COVERAGE.md topic, GAP-* rows whose Domain isn't a known
// topic either, and (only with --deep) that every `D:\...`-shaped local
// path referenced anywhere actually exists on disk -- the "manifest
// reference" check from Phase 18C Part 11, deliberately NOT run by
// default (it touches paths outside the repo and can be slow against
// large preserved archives; it never rehashes file contents, only checks
// existence).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath (not URL.pathname): the latter keeps percent-encoding and breaks
// on any path containing a space, e.g. a "C:\Users\First Last\..." checkout.
const ROOT = dirname(fileURLToPath(import.meta.url));
const DEEP = process.argv.includes("--deep");

const KNOWN_STATUS = new Set(["ACTIVE", "SUPERSEDED", "DEFERRED", "DRAFT_FOR_REVIEW", "FINDING_FOR_BRYAN_REVIEW"]);
const SECRET_PATTERN = /(akh_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{10,}|AIza[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|mysql:\/\/[^\s`]*:[^\s`]*@)/;

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) walk(full, out);
		else if (entry.endsWith(".md")) out.push(full);
	}
	return out;
}

const files = walk(ROOT);
const errors = [];
const warnings = [];

// -- Per-file checks: frontmatter, secrets, relative links --------------
for (const file of files) {
	const text = readFileSync(file, "utf8");

	const statusMatch = text.match(/^status:\s*(.+)$/m);
	if (!statusMatch) {
		warnings.push(`${file}: no "status:" frontmatter field`);
	} else if (!KNOWN_STATUS.has(statusMatch[1].trim())) {
		errors.push(`${file}: unknown status "${statusMatch[1].trim()}"`);
	}

	for (const field of ["category", "audience", "lastVerified"]) {
		if (!new RegExp(`^${field}:`, "m").test(text)) {
			warnings.push(`${file}: no "${field}:" frontmatter field`);
		}
	}

	if (SECRET_PATTERN.test(text)) {
		errors.push(`${file}: text matches a secret-shaped pattern`);
	}

	const linkPattern = /\]\(([^)http][^)]*)\)/g;
	let m;
	while ((m = linkPattern.exec(text))) {
		const target = m[1].split("#")[0];
		if (!target || target.startsWith("mailto:")) continue;
		const resolved = resolve(dirname(file), target);
		try {
			statSync(resolved);
		} catch {
			errors.push(`${file}: broken relative link -> ${target}`);
		}
	}
}

// -- Duplicate GAP-* id check --------------------------------------------
// GAP-P<phase>-<n>: P18 (Phase 18 audit) and P20 (Phase 20 currency/command channel).
const gapIdRowPattern = /^\|\s*(GAP-P\d+-\d+[a-z]?)\s*\|/gm;
const gapDefCounts = new Map();
const gapsFile = join(ROOT, "KNOWLEDGE_GAPS.md");
try {
	const text = readFileSync(gapsFile, "utf8");
	let m;
	while ((m = gapIdRowPattern.exec(text))) {
		gapDefCounts.set(m[1], (gapDefCounts.get(m[1]) ?? 0) + 1);
	}
	for (const [id, count] of gapDefCounts) {
		if (count > 1) errors.push(`KNOWLEDGE_GAPS.md: "${id}" is defined ${count} times (duplicate row)`);
	}
} catch {
	errors.push("KNOWLEDGE_GAPS.md could not be read for GAP-* validation");
}

// -- Domain/topic cross-check --------------------------------------------
// Every Domain cell used in PROCEDURE_INDEX.md/KNOWLEDGE_GAPS.md should be
// a topic this repo actually tracks somewhere (TOPIC_COVERAGE.md's own
// topic column, or the broader topic list in knowledge-sweep.md/this
// audit's own vocabulary). Kept as a warning, not an error -- a genuinely
// new topic showing up is normal, not a bug, but worth a human glance.
const KNOWN_TOPICS = new Set([
	"CASH_WCOIN", "XSHOP_CASHSHOP", "VIP", "PAYMENTS", "GAMESERVER", "LAUNCHER",
	"MARKETPLACE", "ESCROW", "GAMEBRIDGE", "DATABASE", "DEPLOYMENT", "BACKUP",
	"SECURITY", "EVENTS", "ITEM_DELIVERY", "ADMINISTRATION", "KNOWLEDGE_SYSTEM",
	"GOVERNANCE", "PRESERVATION", "ENGINEERING", "COMMUNITY", "WEBSITE/DESIGN",
	"TESTING/DEPLOYMENT", "GENERAL",
]);
for (const name of ["PROCEDURE_INDEX.md", "KNOWLEDGE_GAPS.md"]) {
	try {
		const text = readFileSync(join(ROOT, name), "utf8");
		const rows = text.match(/^\|[^|]+\|\s*([A-Z][A-Z0-9_/]+)\s*\|/gm) || [];
		for (const row of rows) {
			const cell = row.match(/^\|[^|]+\|\s*([A-Z][A-Z0-9_/]+)\s*\|/)[1];
			if (!KNOWN_TOPICS.has(cell)) {
				warnings.push(`${name}: domain/topic "${cell}" is not in this validator's known-topics list -- confirm it's intentional`);
			}
		}
	} catch {
		// file may not exist yet in an earlier phase -- not a hard error
	}
}

// -- Docs <-> machine-artifact consistency (Phase 18D Part 14) ------------
// The drift this catches: knowledge that exists in prose docs but not in
// knowledge/vendor-sweep/*.json (or the reverse). Cheap: JSON reads plus
// existence checks only, never hashing.
const REPO_ROOT = resolve(ROOT, "..", "..");
const MU_ROOT = resolve(REPO_ROOT, ".."); // the research tree lives beside the repo
const VS = join(REPO_ROOT, "knowledge", "vendor-sweep");
const KNOWN_CLAIM_TOPICS = new Set([
	"drop-system", "systems", "operations", "progression", "events",
	"monsters", "security", "commands", "maps",
]);
// Non-KI sourceId conventions already used by the sweep (direct config reads,
// syntheses, code reads, doc cross-references).
const ALLOWED_NON_KI_SOURCE =
	/^(real-config-read|vendor-tutorial-normalization|synthesis-across-|internal-doc-cross-reference|code-read-)/;
let machineSummary = "machine layer not found";
try {
	const index = JSON.parse(readFileSync(join(VS, "knowledge-index.json"), "utf8")).entries;
	const claims = JSON.parse(readFileSync(join(VS, "atomic-claims.json"), "utf8")).claims;
	const kiIds = new Set();
	for (const e of index) {
		if (kiIds.has(e.id)) errors.push(`knowledge-index.json: duplicate source id "${e.id}"`);
		kiIds.add(e.id);
	}

	const researchTreePresent = existsSync(join(MU_ROOT, "Research"));
	if (!researchTreePresent) {
		warnings.push("external research tree (../Research) not present -- transcript path existence check skipped");
	}
	for (const e of index) {
		if (!e.rawArtifact) {
			errors.push(`knowledge-index.json: ${e.id} has no rawArtifact`);
		} else if (researchTreePresent && !existsSync(join(MU_ROOT, e.rawArtifact))) {
			errors.push(`knowledge-index.json: ${e.id} rawArtifact does not exist -> ${e.rawArtifact}`);
		}
	}

	const seenStatement = new Map();
	const claimIds = new Set(claims.map((c) => c.claimId));
	const claimsBySource = new Map();
	for (const c of claims) {
		const kiTokens = [...(c.sourceId || "").matchAll(/KI-\d+/g)].map((m) => m[0]);
		for (const t of kiTokens) {
			if (!kiIds.has(t)) errors.push(`${c.claimId}: sourceId references missing source ${t}`);
			claimsBySource.set(t, (claimsBySource.get(t) ?? 0) + 1);
		}
		if (kiTokens.length === 0 && !ALLOWED_NON_KI_SOURCE.test(c.sourceId || "")) {
			errors.push(`${c.claimId}: sourceId "${c.sourceId}" is neither a KI-* id nor a known non-KI source convention`);
		}
		if (!KNOWN_CLAIM_TOPICS.has(c.topic)) errors.push(`${c.claimId}: unknown topic "${c.topic}"`);
		const key = (c.statement || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
		if (seenStatement.has(key)) errors.push(`${c.claimId}: duplicate of ${seenStatement.get(key)} (same statement)`);
		else seenStatement.set(key, c.claimId);
	}

	// Every video the docs list as registered must have a KI entry for that
	// video and at least one claim (video source without a machine artifact).
	const videoDoc = readFileSync(join(ROOT, "VIDEO_SOURCES.md"), "utf8");
	const rowPattern = /^\|\s*`(KI-\d+)`\s*\|\s*`([A-Za-z0-9_-]{11})`/gm;
	let vm;
	let registeredVideos = 0;
	while ((vm = rowPattern.exec(videoDoc))) {
		registeredVideos++;
		const entry = index.find((e) => e.id === vm[1]);
		if (!entry) errors.push(`VIDEO_SOURCES.md lists ${vm[1]} but knowledge-index.json has no such entry`);
		else if (!(entry.rawArtifact || "").includes(vm[2])) errors.push(`VIDEO_SOURCES.md: ${vm[1]} is listed for video ${vm[2]} but its rawArtifact is ${entry.rawArtifact}`);
		else if (!claimsBySource.get(vm[1])) errors.push(`VIDEO_SOURCES.md lists ${vm[1]} (${vm[2]}) but no machine claim cites it`);
	}

	// Prose docs must not cite a claim/source id the machine layer lacks.
	for (const file of files) {
		const text = readFileSync(file, "utf8");
		for (const m of text.matchAll(/CLAIM-(\d{3})/g)) {
			if (!claimIds.has(m[0])) errors.push(`${file}: cites ${m[0]}, which does not exist in atomic-claims.json`);
		}
		for (const m of text.matchAll(/\bKI-(\d{3})\b/g)) {
			if (!kiIds.has(m[0])) errors.push(`${file}: cites ${m[0]}, which does not exist in knowledge-index.json`);
		}
	}
	machineSummary = `machine layer: ${index.length} sources, ${claims.length} claims, ${registeredVideos} registered-video rows cross-checked`;
} catch (e) {
	warnings.push(`machine-artifact checks skipped: ${e.message}`);
}

// -- Deep mode: verify referenced D:\... local paths exist --------------
if (DEEP) {
	const pathPattern = /`(D:\\[^`]+)`/g;
	const seen = new Set();
	for (const file of files) {
		const text = readFileSync(file, "utf8");
		let m;
		while ((m = pathPattern.exec(text))) {
			const p = m[1].replace(/\\$/, "");
			// Glob/brace-expansion shorthand (D:\...\**, D:\...\{a,b}) is prose,
			// not a literal path -- skip rather than false-positive on it.
			if (/[*{}]/.test(p)) continue;
			if (seen.has(p)) continue;
			seen.add(p);
			try {
				statSync(p);
			} catch {
				errors.push(`${file}: referenced local path does not exist -> ${p}`);
			}
		}
	}
	console.log(`(deep mode: checked ${seen.size} distinct local paths for existence, no content hashing)`);
}

if (errors.length) {
	console.error(`FAIL (${errors.length} error(s), ${warnings.length} warning(s))`);
	for (const e of errors) console.error(" - " + e);
	for (const w of warnings) console.error(" ? " + w);
	process.exit(1);
}
console.log(`PASS (${files.length} files checked, 0 errors, ${warnings.length} warning(s); ${machineSummary})`);
for (const w of warnings) console.log(" ? " + w);
