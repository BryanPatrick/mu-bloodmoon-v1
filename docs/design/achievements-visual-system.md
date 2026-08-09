# Achievements visual system (Etapa 19.8)

Two-part document: **Part 1** is a factual audit of what the achievement
system actually is today (schema, backend, frontend, data). **Part 2** is a
visual-system proposal built on top of that audit — nothing in Part 2 is
implemented; all of it needs operator approval before any real production.

No achievement rule, condition, or mechanic described here was invented.
Where the brief's own conceptual examples (first character, first reset,
Castle Siege, etc.) are used in Part 2, they're marked explicitly as
**proposals**, because — as Part 1 establishes — **zero real achievements
exist in the system today.**

---

## Part 1 — what achievements actually are in BloodMoon

### Data model (`apps/api/prisma/schema.prisma`)

Two separate, non-overlapping systems: **Achievements** (structured,
category/rarity/points) and **Badges** (simpler, expiring, capped).

```prisma
enum CommunityAchievementRarity {
  COMMON
  UNCOMMON
  RARE
  EPIC
  LEGENDARY
}

model CommunityAchievement {
  id          String                      @id @default(uuid())
  name        String
  slug        String                      @unique
  description String
  category    String                      // free text, no enum/fixed taxonomy
  rarity      CommunityAchievementRarity  @default(COMMON)
  points      Int                         @default(0)
  condition   Json?                       // exists, never evaluated (see below)
  imageUrl    String?                     // free-text URL, no upload pipeline
  isActive    Boolean                     @default(false)  // drafts by default
  createdBy / updatedBy / deletedAt (soft-delete) / createdAt / updatedAt
  grants      CommunityAchievementGrant[]
}

model CommunityAchievementGrant {
  id            String
  achievementId String
  accountId     String                    // relates to Account, not CommunityProfile
  grantedBy     String?                   // admin who granted it
  reason        String?                   // required free text
  progressData  Json?                     // exists, never written or read
  grantedAt     DateTime
  revokedAt / revokedBy / revokeReason
  @@unique([achievementId, accountId])    // one grant per account per achievement
}

model CommunityBadge {
  id, name, slug, description
  imageUrl    String?      // free-text URL — but this one DOES have an admin UI field
  visibility  String @default("PUBLIC")   // free text, not an enum
  maxGrants   Int?         // grant cap
  validDays   Int?         // → computes expiresAt on grant
  isActive    Boolean @default(true)      // opposite default from achievements
  // no category, no rarity, no points, no condition
}

model CommunityBadgeGrant {
  badgeId, accountId, grantedBy (required), reason (required)
  grantedAt, expiresAt, removedAt, removedBy
}
```

`CommunityProfile.featuredAchievementIds: Json?` lets a profile list up to 5
achievement ids to "feature" — but nothing on the frontend currently reads
this field (the profile header just shows the first 5 of the full grant
list, not the featured set). Grants relate to `Account`, not
`CommunityProfile`.

### How an achievement is actually unlocked today

**100% manual, admin-initiated. There is no automatic trigger, no rule
engine, no cron job, no event listener that grants an achievement.**

- `condition: Json?` is written by the admin form but **never read or
  evaluated anywhere in the codebase** — it's inert, write-only JSON today.
- `grantAchievement(id, { accountId, reason })` — an admin types an account
  id and a reason into a `window.prompt()` in the admin panel, which calls
  `POST /admin/community/achievements/:id/grants`. That's the entire
  unlock mechanism.
- `progressData: Json?` exists on the grant model but is never set or read
  — there is no partial-progress concept (e.g. "3 of 10") for achievements
  today. (A _different_, unrelated feature — `CommunityQuest` — does have an
  admin-settable 0-100 progress field, but quests are not achievements.)
- **No reward is attached to unlocking.** Granting an achievement or badge
  writes the grant row and an audit log entry; nothing credits currency,
  grants an item, or unlocks a cosmetic.
- **No game-state trigger exists.** The grant code never reads
  `AccountCharacter.level`/`.reset`/`.masterReset`/`.pkStatus` or any other
  in-game field — despite those fields existing elsewhere in the schema for
  the character/marketplace features. Achievements are currently
  profile/community-only, disconnected from actual gameplay data.

### Admin management — what's actually configurable today

Full CRUD exists (`community-admin.service.ts` + `CommunityAdminManager.vue`,
tabs "achievements"/"badges"), but it's **incomplete and asymmetric**:

| Field                 | Achievement admin form                                     | Badge admin form             |
| --------------------- | ---------------------------------------------------------- | ---------------------------- |
| name, description     | yes                                                        | yes                          |
| category              | yes (free text)                                            | — (no category concept)      |
| rarity                | yes (dropdown, 5 real values)                              | — (no rarity concept)        |
| points                | yes                                                        | —                            |
| **imageUrl**          | **no field in the UI** — only settable via direct API call | yes, plain URL text input    |
| condition             | no field anywhere — API-only                               | n/a                          |
| maxGrants / validDays | n/a                                                        | yes                          |
| Row actions           | Ativar, Duplicar, Atribuir                                 | Atribuir, Remover atribuição |

Two more gaps worth knowing about before designing anything: `revokeAchievement`
exists on the backend but has **no button and no composable method on the
frontend** (badges have a working revoke flow, achievements don't); and
`DEACTIVATE`/`ARCHIVE` actions exist on the backend but have no buttons
either (only `ACTIVATE`/`DUPLICATE` are wired up).

### How achievements render today — the actual icon bug

This is the most important fact for the visual-system proposal below:
**the icon is not read from `imageUrl` at all.** The frontend mapper
(`apps/web/features/community/map-profile-response.ts`) hardcodes:

```ts
icon: 'trophy' // always, for every single achievement, regardless of imageUrl
```

`CommunityAchievementPopover.vue` maps a 5-key icon set (`trophy`, `shield`,
`swords`, `star`, `crown` — Lucide icons) but only `'trophy'` is ever
actually assigned, so the other four are dead code paths today.
`playerPercentage` is likewise a hardcoded em-dash, not a computed value.
**Badges have no frontend display component at all** — nothing renders
`badgeGrants` anywhere in `apps/web`.

This means: today, every achievement anyone earns shows the identical
generic Trophy glyph. There is no per-achievement image, no "no icon yet"
fallback state distinct from "has an icon" — because the image is never
fetched into the view in the first place. Fixing this data-plumbing bug is
a prerequisite for any real per-achievement icon to ever appear; it's noted
here as a known gap, not fixed in this etapa (see "What this etapa did and
didn't do" at the end).

### Storage — is there a pipeline this could reuse?

No. `imageUrl` is a raw string field with zero upload/validation behind it
for achievements or badges. The Community module does have a real media
pipeline (`apps/api/src/modules/media/media.service.ts`): validates real
image bytes via `sharp` (format/dimensions/pixel-count/MIME-vs-extension),
re-encodes to WebP, writes to local disk under `COMMUNITY_MEDIA_DIR`
(default `storage/community-media`), hashes with SHA-256, and serves at
`/media/community/:filename`. It's currently wired only to post attachments
and avatar/cover uploads — not to achievements. There's no Cloudflare R2 or
artifact-quarantine system in `apps/api` at all (that pattern exists in a
separate, unrelated tool used to track this project's own work, not in
BloodMoon's deployed stack) — so any achievement-icon pipeline should reuse
BloodMoon's own local-disk-plus-`sharp` pattern, not assume R2 is available.

### Catalog of existing achievements

**None.** Confirmed by checking every place real data could live — seed
scripts, migration `INSERT` statements, fixture files — all empty. The
`CommunityAchievement`/`CommunityBadge` tables have zero rows by design;
every one that will ever exist has to be created through the admin panel
described above. This is not a small or incomplete catalog to extend — it's
a genuinely empty one to start.

---

## Part 2 — proposed visual system

Everything below is a **proposal**. Nothing is implemented, no real icon was
generated, and no achievement content was created. This section exists so
the operator can approve a direction before any production work starts, per
this etapa's explicit instructions.

### The concept, applied honestly to an empty catalog

The brief's conceptual examples (first character → start of the journey,
first reset → rebirth, 100 resets → veterancy, Castle Siege → territorial
conquest, guild → alliance, boss kill → combat trophy, event → special
participation, economy → trade/wealth, exploration → discovery) are **not
real BloodMoon achievements** — they're illustrative only, and are used
below purely to demonstrate how the proposed visual template would apply to
different concept "families." If/when the operator defines real
achievements, each one should be classified into a concept family the same
way before an icon is commissioned — the _categories themselves_ are
currently unconstrained free text in the schema (`category: String`, no
enum), so this doc also recommends the operator settle on a fixed list of
categories before the catalog grows, purely so the visual families below
stay meaningful (a fixed enum is a small follow-up change, not proposed as
part of this etapa).

Proposed initial concept families (for validation, not as final content):

| Family                   | What it represents    | Achievements it _might_ eventually cover    |
| ------------------------ | --------------------- | ------------------------------------------- |
| Origem (Origin)          | Starting the journey  | First character created, first login        |
| Progressão (Progression) | Growth over time      | First reset, reset milestones, master reset |
| Combate (Combat)         | Fighting prowess      | First PvP win, boss kills                   |
| Território (Territory)   | Large-scale conquest  | Castle Siege participation/victory          |
| Aliança (Alliance)       | Social/guild bonds    | Guild founded, guild milestones             |
| Comércio (Trade)         | Economy               | Marketplace/loja activity milestones        |
| Exploração (Exploration) | World discovery       | Map/zone milestones                         |
| Eventos (Events)         | Special participation | Seasonal/limited events                     |

### Visual language: not an icon, a relic

Per the brief's own direction and confirmed by the real identity audit in
`visual-identity.md`, an achievement should not read as a flat menu icon —
it should read as an object the character _owns_, in the same material
language as the BloodMoon logo itself: dark gunmetal, blood-red accents,
silver/steel highlights, rune-like etching, spiked/gothic ornamentation,
a central gem or light source. Concretely, the logo already demonstrates
almost the entire vocabulary an achievement medallion needs — the same
"crest" reading, just at token scale instead of wordmark scale.

Recommended form: **medalhão/emblema (medallion)** — a circular-to-shield
silhouette, since it reads clearly at small sizes (unlike an irregular
relic/artifact silhouette) while still supporting an ornate carved frame.
Avoid flat SaaS-style badge shapes (rounded squares, simple circles with a
single-color fill) and avoid literal FontAwesome/emoji pictograms — the
symbol at the center should be a rendered object (a weapon, a crest, a
creature, a gem), not a glyph.

### Rarity → visual treatment

The rarity system **already exists in code** (`CommunityAchievementRarity`:
COMMON, UNCOMMON, RARE, EPIC, LEGENDARY) — this is not a new proposal, it's
the real enum. Proposed mapping of rarity to material/frame treatment
(badges have no rarity field, so this only applies to achievements — see
"open questions" below):

| Rarity    | Frame material                   | Accent                          | Extra detail                                                       |
| --------- | -------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| COMMON    | Plain worn iron                  | Minimal/no gem                  | Simple etched border                                               |
| UNCOMMON  | Polished steel                   | Small silver gem                | Light rune etching                                                 |
| RARE      | Steel + bronze inlay             | Blue-white gem                  | Full rune border                                                   |
| EPIC      | Dark gunmetal + gold inlay       | Red gem, faint glow             | Spiked ornament (logo-level detail)                                |
| LEGENDARY | Black steel + gold, worked metal | Red gem, visible glow/particles | Full spiked crest, background motif (small moon/castle silhouette) |

This scales complexity _up_ with rarity rather than redesigning the whole
object per tier — the base medallion silhouette and camera angle stay
identical across all five; only the frame material, inlay, and glow
intensity change. That's what makes 100+ icons feel like one collection
instead of five unrelated icon sets.

### Template (per achievement)

```
[ frame / rarity tier ]
        ↓
[ central symbol — the thing being commemorated ]
        ↓
[ thematic details around the symbol — category cue ]
        ↓
[ background material / vignette ]
        ↓
[ optional effects — glow, particles (rarity-gated, see above) ]
```

The frame communicates rarity (and, via subtle color-family shifts, could
also hint at category — e.g. a cooler steel-blue tint for Combate vs. a
warmer gold tint for Comércio — without needing a second visual system).
The central symbol is the only element that changes per-achievement
meaning; everything else is the shared "coat" that makes the whole
collection legible as one set.

### States

The real data model only distinguishes **granted** (has a
`CommunityAchievementGrant` row, not revoked) vs. **not granted**. There is
no partial-progress state today (`progressData` is unused — see Part 1).
Proposed treatment, following the brief's own guidance to avoid doubling
the asset count:

- **LOCKED** (not granted): same medallion art, desaturated toward gray,
  reduced opacity, subtle drop shadow instead of glow, small lock glyph
  overlay (UI chrome, not part of the generated art itself).
- **UNLOCKED** (granted, not revoked): full color, rarity glow active per
  the table above.
- A **REVOKED** state exists in the data (`revokedAt` set) but has no
  current UI treatment anywhere — worth the operator deciding whether a
  revoked achievement should just disappear from the profile (simplest) or
  show some distinct state; not addressed further here since it's a product
  decision, not a visual one.

This means **one generated asset per achievement**, not two or three — the
locked/unlocked difference is a CSS/runtime treatment (desaturate, dim,
overlay), applied identically regardless of which specific achievement it
is.

### Scalability (20 → 100 → 500 achievements)

The template above is deliberately structured so growth doesn't require new
art direction each time:

- Frame/rarity treatment is shared across all achievements of the same
  rarity — designing 5 frame "recipes" (one per rarity) covers unlimited
  future achievement count.
- Only the central symbol is achievement-specific, and it's described by a
  short, structured spec (see prompt-base below), not free-form art
  direction each time.
- Category tinting (if adopted) is a small, fixed palette shift, not new
  linework.

### Pipeline (proposed, not automated)

```
Achievement definition (name, category, rarity, description)
        ↓
Visual specification (central symbol description, using the category table above)
        ↓
Structured prompt (prompt-base + achievement-specific symbol description)
        ↓
Image generation (master resolution)
        ↓
Human review against this doc's consistency rules
        ↓
Crop/resize to delivery sizes
        ↓
Optimization (re-encode, same pattern as the existing Community media
  pipeline: validate real bytes, convert to WebP)
        ↓
Storage (extend the existing local-disk Community media pattern —
  e.g. a new storage/achievement-icons directory served the same way
  post/avatar media already is — rather than introducing a new storage
  system)
        ↓
Achievement catalog (imageUrl field — already exists on the model)
        ↓
Frontend (requires fixing the hardcoded 'trophy' mapper bug described in
  Part 1 before any of this becomes visible to players)
```

No step here is automated by this etapa. Publishing, generation, and
storage wiring all require explicit follow-up work and approval.

### Prompt-base (reusable, for future generation)

This is the shared skeleton every achievement-icon prompt should start
from, so 100 icons read as one collection. The bracketed part is the only
thing that changes per achievement.

> A single game achievement medallion icon for "BloodMoon MU Online", dark
> gothic-fantasy style matching a blood-red-and-gunmetal crest logo.
> Circular-to-shield medallion silhouette, centered composition, straight-on
> camera angle, even studio-style lighting on the object with a soft rim
> light. Materials: dark gunmetal and worked black steel frame with
> [RARITY MATERIAL: e.g. "gold inlay and a glowing red gem at the top"],
> fine rune-like etching along the border, spiked ornamental accents echoing
> a gothic crest. Central symbol: [ACHIEVEMENT-SPECIFIC SYMBOL, e.g. "a
> crossed sword and dagger, weathered steel, faint red edge glow" — described
> as a physical object, not a flat icon glyph]. Background: dark vignette,
> [CATEGORY TINT: e.g. "cool steel-blue" for Combate / "warm amber" for
> Comércio], no scenery, no characters, no text, no watermark. Realistic
> cinematic rendering, not flat vector, not 3D-glossy/plastic, not clip art.
> Square canvas, subject fills ~80% of frame with even margin on all sides.

Fields to fill per achievement: `RARITY MATERIAL` (from the rarity table),
`ACHIEVEMENT-SPECIFIC SYMBOL` (one or two sentences, object-based), and
optionally `CATEGORY TINT` (from the category table, only if category
tinting is adopted). Keeping composition/camera/lighting/materials/
background/border fixed across every prompt is what keeps the set coherent
— per-achievement variation should only ever touch the symbol and the two
bracketed tier/category fields.

### Formats

Following the brief's own suggested sizing (no counter-evidence found to
deviate) and matching the re-encode convention the existing Community media
pipeline already established (validate → convert to WebP):

- **Master**: 1024×1024, generation/archival resolution.
- **Delivery**: 512×512 (profile detail/popover), 256×256 (grid/list),
  128×128 (compact/notification contexts) — exact sizes to confirm once a
  real UI slot is designed, these are starting proposals.
- **Format**: WebP for delivery sizes (matches existing Community media
  convention); keep the 1024 master as PNG for archival/re-export quality.
- **Storage**: extend the existing local-disk pattern (see pipeline above)
  rather than introducing new storage architecture — no change to how
  `apps/api` stores media today.

### Open questions for the operator (not decided here)

1. Should `CommunityBadge` gain a `rarity`/`category` field to match
   achievements, or is the simpler badge system intentionally
   rarity-agnostic (e.g. for time-limited event badges)?
2. Should `category` become a fixed enum (matching the concept families
   proposed above, or a different operator-chosen list) instead of free
   text, before the catalog grows past a handful of entries?
3. Category color-tinting: adopt it, or keep rarity as the only visual
   variable? (Both are viable; tinting adds a second axis of meaning but
   also a second thing to keep consistent across 100+ icons.)
4. What should the REVOKED state look like on a profile, if anything?
5. Where should achievement icons physically live — a new
   `storage/achievement-icons/` directory alongside
   `storage/community-media/`, or inside the existing Community media
   directory under a subpath? (Either works; this is a naming/organization
   decision, not an architecture one.)

## What this etapa did and didn't do

**Did**: audit the real schema/backend/frontend/data (Part 1), propose a
visual system grounded in the real designer identity and the real rarity
enum (Part 2), and write a reusable prompt-base. **Did not**: generate any
achievement icon, create any achievement/badge content, fix the hardcoded
`'trophy'` icon-mapper bug, build a badge display component, or wire up any
storage/upload pipeline. All of that requires operator approval of the
direction above first, per this etapa's explicit scope.
