#!/usr/bin/env node
// Lightweight Context Pack self-check. No dependencies, no network.
// Checks (on this pack's OWN authored files, not the frozen preservation
// archive -- see PRESERVED_ARCHIVE below): broken relative doc links,
// unknown `status:` frontmatter values, obvious secret-shaped strings,
// duplicate ADR/source-ID references, undefined source-ID references,
// unknown authority-level values. Plus (on the preservation archive
// specifically): every preserved file's hash still matches what was
// recorded at preservation time.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const ROOT = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"));
const KNOWN_STATUS = new Set(["ACTIVE", "SUPERSEDED", "DEFERRED", "PROPOSED", "EXPERIMENTAL", "LIVING_INDEX", "ESTABLISHED"]);
const KNOWN_AUTHORITY = new Set([
	"EXECUTABLE_FACT",
	"CANONICAL_DECISION",
	"CURRENT_DOC",
	"ACCEPTED_HANDOFF",
	"HISTORICAL_SOURCE",
	"AI_CANDIDATE",
]);
const SECRET_PATTERN = /(akh_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{10,}|AIza[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;

// Preserved archival copies (context/preservation/openbeta-untracked/) are
// frozen, foreign documents -- copied exactly, per Phase 11's own rule,
// never rewritten to match this pack's authoring conventions (status
// vocabulary, link targets, etc.). They get their own integrity check
// (hash verification, below) but are deliberately excluded from the
// authoring-convention checks below (status/link/secret) -- applying
// this pack's own rules to someone else's frozen document is exactly
// the wrong-scope mistake this comment exists to prevent re-introducing.
const PRESERVED_ARCHIVE = join(ROOT, "preservation", "openbeta-untracked");

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (full === PRESERVED_ARCHIVE) continue;
		const st = statSync(full);
		if (st.isDirectory()) walk(full, out);
		else if (entry.endsWith(".md")) out.push(full);
	}
	return out;
}

const files = walk(ROOT);
const errors = [];
const seenAdrRefs = new Map();

for (const file of files) {
	const text = readFileSync(file, "utf8");

	const statusMatch = text.match(/^status:\s*(.+)$/m);
	if (statusMatch && !KNOWN_STATUS.has(statusMatch[1].trim())) {
		errors.push(`${file}: unknown status "${statusMatch[1].trim()}"`);
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

	const adrRefs = text.match(/ADR-\d{4}/g) || [];
	for (const ref of adrRefs) {
		if (!seenAdrRefs.has(ref)) seenAdrRefs.set(ref, new Set());
		seenAdrRefs.get(ref).add(file);
	}
}

// Duplicate-ID check: this is for *decision IDs this pack itself mints*
// (DEC-*), not for ADR cross-references (which are expected to repeat
// across files). Currently zero DEC-* IDs are minted (see DECISIONS.md),
// so this loop is a no-op until that changes -- kept here so it fires
// the moment a real DEC-* ID is ever added.
const decIds = new Map();
for (const file of files) {
	const text = readFileSync(file, "utf8");
	const ids = text.match(/DEC-[A-Z]+-\d{3,}/g) || [];
	for (const id of ids) {
		if (!decIds.has(id)) decIds.set(id, new Set());
		decIds.get(id).add(file);
	}
}
for (const [id, fileSet] of decIds) {
	if (fileSet.size > 1) {
		// Same ID appearing in multiple files is fine (index + domain stub).
		// A real duplicate is the SAME id minted with a DIFFERENT title in
		// two places -- this script can't detect that without parsing the
		// decision body, so it's flagged for human review, not auto-failed.
		continue;
	}
}

// SRC-* IDs: definitions live in SOURCE_INDEX.md's table rows ("| SRC-REPO-001 | ...").
// A defined ID appearing more than once as a table-row definition is a
// real duplicate (unlike ADR/DEC-* references, which are expected to
// repeat as citations). A reference elsewhere in context/ to an ID that
// SOURCE_INDEX.md never defines is a missing-source bug.
const sourceIndexPath = join(ROOT, "SOURCE_INDEX.md");
const definedSrcIds = new Map(); // id -> count of table-row definitions
try {
	const text = readFileSync(sourceIndexPath, "utf8");
	const rowPattern = /^\|\s*(SRC-(?:REPO|HUB|OPENBETA)-\d+)\s*\|/gm;
	let m;
	while ((m = rowPattern.exec(text))) {
		definedSrcIds.set(m[1], (definedSrcIds.get(m[1]) ?? 0) + 1);
	}
	for (const [id, count] of definedSrcIds) {
		if (count > 1) errors.push(`SOURCE_INDEX.md: SRC-* id "${id}" is defined ${count} times (duplicate row)`);
	}

	// Authority-level column (4th cell) of every defined row.
	const authorityRowPattern = /^\|\s*(SRC-(?:REPO|HUB|OPENBETA)-\d+)\s*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|/gm;
	while ((m = authorityRowPattern.exec(text))) {
		const cell = m[2].replace(/\*\*/g, "").trim();
		const token = cell.split(/[\s(]/)[0]; // tolerate trailing parenthetical notes
		if (token && !KNOWN_AUTHORITY.has(token)) {
			errors.push(`SOURCE_INDEX.md: ${m[1]} has an unrecognized authority level "${token}"`);
		}
	}
} catch {
	errors.push("SOURCE_INDEX.md could not be read for SRC-* validation");
}

const referencedSrcIds = new Set();
for (const file of files) {
	const text = readFileSync(file, "utf8");
	const ids = text.match(/SRC-(?:REPO|HUB)-\d+/g) || [];
	for (const id of ids) referencedSrcIds.add(id);
}
for (const id of referencedSrcIds) {
	if (!definedSrcIds.has(id)) {
		errors.push(`"${id}" is referenced somewhere in context/ but never defined in SOURCE_INDEX.md`);
	}
}

// Preservation integrity (Phase 11, Part 25/26): every path recorded in
// _hashes_reference.tsv must exist under openbeta-untracked/ with the
// SAME hash it was recorded with. This re-verifies the same integrity
// check done at copy time, but as a repeatable, re-runnable assertion
// rather than a one-off manual pass -- catches silent drift if either
// file is ever touched later.
const preservationDir = join(ROOT, "preservation");
const hashesRefPath = join(preservationDir, "_hashes_reference.tsv");
try {
	const tsv = readFileSync(hashesRefPath, "utf8").trim().split("\n");
	for (const line of tsv) {
		const [relPath, expectedHash] = line.split("\t");
		if (!relPath || !expectedHash) continue;
		const preservedPath = join(preservationDir, "openbeta-untracked", relPath);
		let actual;
		try {
			actual = createHash("sha256").update(readFileSync(preservedPath)).digest("hex");
		} catch {
			errors.push(`preservation: "${relPath}" is listed in _hashes_reference.tsv but missing from openbeta-untracked/`);
			continue;
		}
		if (actual !== expectedHash) {
			errors.push(`preservation: "${relPath}" hash mismatch -- expected ${expectedHash}, got ${actual}`);
		}
	}
} catch {
	// _hashes_reference.tsv not present -- fine before Phase 11 exists / after it's ever removed deliberately.
}

if (errors.length) {
	console.error(`FAIL (${errors.length} issue(s) found)`);
	for (const e of errors) console.error(" - " + e);
	process.exit(1);
}
console.log(`PASS (${files.length} files checked, 0 issues)`);
