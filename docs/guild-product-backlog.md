# Guild Product Backlog

Status: DESIGN / BACKLOG / FUTURE for every item below unless explicitly marked otherwise. Nothing here is implemented. This document records product direction discussed with the user for future guild work — it does not authorize or schedule any of it.

Do not mark anything IMPLEMENTED just because a similar idea already exists in code. Where an item overlaps with something already shipped (Steps 1-5.5: profile, self-management, recruitment modes, join/invite flows, member management, role management, kick, leadership transfer, self-service creation, leader disband), that overlap is called out under CURRENT_STATUS, but the *new* capability described is still BACKLOG.

Events and Community remain out of scope for all items here.

---

## 1. Guild Discovery / Directory (richer listing)

- **FEATURE**: Expand the directory card/listing beyond current fields.
- **PURPOSE**: Help players choose a guild faster with richer at-a-glance information.
- **CURRENT_STATUS**: Directory today shows name, tag, recruitment mode, focus tags, guild level, sort by newest/level/members/name. Emblem/banner exist on the profile but are not yet surfaced in directory cards. No short "guild message" field, no member count shown on cards currently.
- **PRODUCT_DECISION**: Candidate fields — name, tag, emblem, banner, short guild message, member count, guild level, recruitment status/mode, primary focus. Candidate future filters — focus, recruiting-or-not, guild level, member count, activity, others as they make sense. UX not finalized.
- **OPEN_QUESTIONS**: Exact card layout; which fields are always visible vs. on-hover/expand; whether "short message" is a new field on Guild or reuses `description` truncated.
- **BACKEND_IMPACT**: Possibly a new short-message column; directory query already supports most filters, would need a few more `where` clauses.
- **FRONTEND_IMPACT**: Directory card redesign (visual, not just data).
- **GAMEBRIDGE_DEPENDENCY**: None.
- **TELEMETRY_DEPENDENCY**: None for the fields listed; "activity" filter would need Guild Activity (item 23) first.
- **SECURITY_CONCERNS**: None identified.
- **BETA_CANDIDATE**: YES (listed explicitly under item 29 as a near-term candidate).
- **COMPLEXITY**: Low-medium.

## 2. Member Listing Views/Sorts

- **FEATURE**: Multiple views/orderings of the member list (All, Power, Contribution, Activity, PvP, Progression, Role).
- **PURPOSE**: Let members and leadership see the roster from different angles.
- **CURRENT_STATUS**: Member list exists (Guild Step 3), sorted by role then join date, with management actions. No alternate sort/view modes.
- **PRODUCT_DECISION**: Not implementing now. Depends on Power (item 3), Contribution (item 6), and Activity (item 23) existing first.
- **OPEN_QUESTIONS**: Whether views are tabs, a sort dropdown, or separate pages.
- **BACKEND_IMPACT**: Depends on the underlying metric existing (see items 3, 6, 23).
- **FRONTEND_IMPACT**: New sort/view controls on the members tab.
- **GAMEBRIDGE_DEPENDENCY**: Possibly, for real PvP/activity data.
- **TELEMETRY_DEPENDENCY**: Possibly, for activity.
- **SECURITY_CONCERNS**: None identified.
- **BETA_CANDIDATE**: NO (blocked on items 3/6/23).
- **COMPLEXITY**: Low once dependencies exist.

## 3. Guild Power Ranking

- **FEATURE**: A per-character "power" ordering usable for guild rankings.
- **PURPOSE**: Give members/leadership a sense of relative character strength within the guild.
- **CURRENT_STATUS**: Not implemented. `AccountCharacter` has `level`, `reset`, `masterReset` fields today; no gear/equipment score exists anywhere in the portal.
- **PRODUCT_DECISION**: **Master Reset (MR) is explicitly excluded from the power calculation.** Reason (user-specified): performing MR resets the character's Reset/Level progression per the server's own mechanic and grants a separate reward; MR itself can also be lost/altered in flows like character sales. It is therefore not a stable indicator of current power. Power order, in priority: **Reset > Level > Gear** (hierarchical/lexicographic comparison, not an arbitrary weighted formula). Example: compare Reset first; on a tie, compare Level; on a further tie, compare Gear Score once one exists.
- **OPEN_QUESTIONS**: None on the ordering itself; Gear's contribution depends on item 4.
- **BACKEND_IMPACT**: A ranking query/endpoint sorting by `(reset desc, level desc, gearScore desc)` once Gear Score exists; none until then beyond `(reset desc, level desc)`.
- **FRONTEND_IMPACT**: A ranking view (see item 2).
- **GAMEBRIDGE_DEPENDENCY**: None beyond what's already synced (reset/level).
- **TELEMETRY_DEPENDENCY**: None.
- **SECURITY_CONCERNS**: None identified.
- **BETA_CANDIDATE**: YES for a simple Reset→Level ranking (listed under item 29's near-term candidates as "rankings simples Reset/Level"). Gear-inclusive ranking is FUTURE.
- **COMPLEXITY**: Low for Reset/Level only; TBD once Gear Score is defined.

## 4. Gear Score

- **FEATURE**: A formula scoring a character's equipped gear.
- **PURPOSE**: Feed the Gear tier of Power Ranking (item 3) once defined.
- **CURRENT_STATUS**: No formula exists. No `GEAR_SCORE_AVAILABLE` flag exists in code.
- **PRODUCT_DECISION**: Formula is **not defined yet**. Represent availability conceptually as `GEAR_SCORE_AVAILABLE = YES/NO`. While `NO`, Power Ranking uses Reset → Level only. Once a reliable Gear Score exists, Power Ranking becomes Reset → Level → Gear. Do not invent the formula now. Future formula may consider (none decided): item tier, item level, Excellent, Ancient, Harmony, sockets, wings, accessories, other relevant properties.
- **OPEN_QUESTIONS**: Entire formula; data availability for the listed properties (some may not be portal-visible without a GameBridge sync).
- **BACKEND_IMPACT**: TBD, likely significant (needs equipment data modeling).
- **FRONTEND_IMPACT**: TBD.
- **GAMEBRIDGE_DEPENDENCY**: Likely YES — equipped-item detail beyond what's currently synced.
- **TELEMETRY_DEPENDENCY**: Possibly.
- **SECURITY_CONCERNS**: None identified yet; TBD once formula/data source is chosen.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: TBD / likely high (data modeling + formula design + balancing).

## 5. Master Reset Visibility (unchanged scope, explicit exclusion noted)

- **FEATURE**: Continue showing Master Reset on character profile, progression, history, and a dedicated MR ranking.
- **PURPOSE**: MR remains a real, visible achievement — just not a Power input.
- **CURRENT_STATUS**: `AccountCharacter.masterReset` exists and can already be displayed; no dedicated MR ranking view exists.
- **PRODUCT_DECISION**: Keep MR visible in those surfaces. **Explicitly do not fold it into Guild Power Ranking** (see item 3's rationale).
- **OPEN_QUESTIONS**: Whether a standalone "MR Ranking" view is wanted server-wide or per-guild.
- **BACKEND_IMPACT**: Low if reusing existing field; a ranking endpoint if built.
- **FRONTEND_IMPACT**: A ranking view if built.
- **GAMEBRIDGE_DEPENDENCY**: None beyond current sync.
- **TELEMETRY_DEPENDENCY**: None.
- **SECURITY_CONCERNS**: None identified.
- **BETA_CANDIDATE**: NO (not requested as urgent; Power Ranking exclusion is the only immediately actionable part, and that's a rule for item 3, not new work here).
- **COMPLEXITY**: Low.

## 6. Guild Contribution (separate system from Power)

- **FEATURE**: A distinct "how much has this member contributed to the guild" metric.
- **PURPOSE**: Explicitly separate from Power. Power = "how developed/strong is the character." Contribution = "how much has this member contributed to the guild."
- **CURRENT_STATUS**: `GuildMember.contributionScore` already exists as a schema field and is displayed today (Guild Step 3 member list), but nothing writes to it — no formula, no source of truth, no earning mechanism exists.
- **PRODUCT_DECISION**: Formula **not defined yet**. Possible future sources (none weighted or decided): Guild Quests, bosses, Castle Siege, events, collective objectives, guild-related PvP, donations/resources, activity, other relevant actions.
- **OPEN_QUESTIONS**: Entire formula and weighting; which of the possible sources actually ship first.
- **BACKEND_IMPACT**: Significant — needs an actual writer for `contributionScore` (or a replacement mechanism) tied to whichever source(s) are chosen.
- **FRONTEND_IMPACT**: Display already exists; would need per-source breakdown eventually.
- **GAMEBRIDGE_DEPENDENCY**: Likely YES for boss/siege/PvP-sourced contribution.
- **TELEMETRY_DEPENDENCY**: Possibly, for activity-based contribution.
- **SECURITY_CONCERNS**: Anti-manipulation of contribution sources (see item 15) will matter once this is real, especially if contribution gates voting (item 7).
- **BETA_CANDIDATE**: NO (formula undefined).
- **COMPLEXITY**: High (multiple possible sources, no formula yet).

## 7. Contribution as a Requirement (voting, elections, internal access)

- **FEATURE**: Use Contribution as a gate for certain guild-internal privileges.
- **PURPOSE**: Ensure privileges like voting are earned, not automatic on joining.
- **CURRENT_STATUS**: Not implemented; depends entirely on item 6 existing first.
- **PRODUCT_DECISION**: Contribution may gate: voting, running for election, internal rankings, access to certain features, other social rules. Minimum value **not defined**. Represent conceptually as `MIN_CONTRIBUTION_TO_VOTE = TBD`.
- **OPEN_QUESTIONS**: The actual minimum; whether the same minimum applies to all gated privileges or each has its own.
- **BACKEND_IMPACT**: A configurable threshold, once Contribution (item 6) is real.
- **FRONTEND_IMPACT**: Gating UI (e.g., "you need N more Contribution to vote").
- **GAMEBRIDGE_DEPENDENCY**: Inherits item 6's.
- **TELEMETRY_DEPENDENCY**: Inherits item 6's.
- **SECURITY_CONCERNS**: Same anti-manipulation concerns as item 6, now with a direct incentive to game Contribution for voting power.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: Medium, but blocked on item 6.

## 8. Guild Governance (elections framework, opt-in)

- **FEATURE**: A guild governance/elections system.
- **PURPOSE**: Let guilds that want democratic role assignment opt into it.
- **CURRENT_STATUS**: Not implemented. `GuildMember.roleKey` is a free-text field with a service-enforced vocabulary (LEADER/OFFICER/TREASURER/MEMBER/RECRUIT); no election concept exists anywhere.
- **PRODUCT_DECISION**: Elections are **optional per guild** — the leader/owner decides whether their guild uses an electoral system at all.
- **OPEN_QUESTIONS**: Where this toggle lives (Guild settings?), what happens to existing appointed roles when elections are first enabled.
- **BACKEND_IMPACT**: A per-guild settings flag at minimum; a full elections subsystem for the feature itself (see items 9-15).
- **FRONTEND_IMPACT**: Guild settings toggle; election UI (see items 9-15).
- **GAMEBRIDGE_DEPENDENCY**: None identified.
- **TELEMETRY_DEPENDENCY**: None identified.
- **SECURITY_CONCERNS**: See item 15 (anti-abuse).
- **BETA_CANDIDATE**: NO (explicitly listed under item 29's future/advanced systems).
- **COMPLEXITY**: High.

## 9. Elections — Roles Below Owner

- **FEATURE**: Configurable per-role election toggle for ranks below the leader.
- **PURPOSE**: Let a guild make specific ranks (not all of them) elective.
- **CURRENT_STATUS**: Not implemented.
- **PRODUCT_DECISION**: A configuration such as `ELECTIONS_ENABLED = YES/NO`; when enabled, specific roles below the owner enter periodic electoral process. Initial candidate roles: OFFICER, TREASURER, plus other future roles as they make sense. **Not all roles become elective automatically** — this is opt-in per role, not a blanket switch.
- **OPEN_QUESTIONS**: Exact per-role toggle UI; interaction with item 11 (custom ranks, deferred separately from Guild Step 3/4).
- **BACKEND_IMPACT**: Per-role elective flag; periodic election scheduling/execution logic.
- **FRONTEND_IMPACT**: Configuration UI + election UI.
- **GAMEBRIDGE_DEPENDENCY**: None identified.
- **TELEMETRY_DEPENDENCY**: None identified.
- **SECURITY_CONCERNS**: See item 15.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: High.

## 10. Leadership Election (separate from normal elections)

- **FEATURE**: A leader-initiated, explicit leadership succession election.
- **PURPOSE**: Give a leader a democratic succession path without accidentally putting leadership up for grabs via item 9's mechanism.
- **CURRENT_STATUS**: Not implemented. Leadership transfer today (Guild Step 4) is a direct, LEADER-initiated, single-target transfer — not an election.
- **PRODUCT_DECISION**: Leader/owner election is **explicitly separate** from the item 9 elections. Enabling elections for OFFICER/TREASURER does **not** automatically put leadership into contention. The leader must explicitly start a `LEADERSHIP_ELECTION`. Use cases: leader plans to stop playing, leader plans to leave the guild, leader wants to choose a successor democratically, planned succession, other future scenarios.
- **OPEN_QUESTIONS**: Interaction with the existing direct-transfer flow (Guild Step 4) — does the election replace it, or do both coexist as separate paths to the same `updateMemberRole(roleKey: 'LEADER')` transition?
- **BACKEND_IMPACT**: A new election-initiation and resolution flow, likely still landing on the same atomic transfer primitive already built and hardened in Guild Step 4.
- **FRONTEND_IMPACT**: Election initiation UI, ballot UI, results UI.
- **GAMEBRIDGE_DEPENDENCY**: None identified.
- **TELEMETRY_DEPENDENCY**: None identified.
- **SECURITY_CONCERNS**: Must preserve the "exactly one LEADER" invariant already enforced (Phase 0 + Guild Step 4 concurrency guards) — an election resolving into the same transfer primitive is the safest path.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: High, though it can potentially reuse the already-hardened transfer primitive as its final step.

## 11. Secret Ballot

- **FEATURE**: Anonymous voting for elections.
- **PURPOSE**: Protect voter privacy in guild elections.
- **CURRENT_STATUS**: Not implemented (no elections exist yet).
- **PRODUCT_DECISION**: `SECRET_BALLOT = YES`. Individual vote identity is never revealed publicly. Results may show vote counts, percentages, and the winner — never who voted for whom.
- **OPEN_QUESTIONS**: Whether ballots are cryptographically anonymized or just not displayed (implementation detail for later); audit/anti-fraud tension with true secrecy.
- **BACKEND_IMPACT**: Vote storage that doesn't trivially expose voter→candidate mapping in any admin view either, unless a deliberate moderation exception is decided later.
- **FRONTEND_IMPACT**: Ballot UI, results UI (aggregate only).
- **GAMEBRIDGE_DEPENDENCY**: None.
- **TELEMETRY_DEPENDENCY**: None.
- **SECURITY_CONCERNS**: Balancing secrecy with anti-abuse detection (item 15) is a real tension to design carefully later.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: Medium-high.

## 12. Voting Eligibility

- **FEATURE**: Rules for who may vote in a guild election.
- **PURPOSE**: Prevent trivial vote manipulation via brand-new or low-investment members.
- **CURRENT_STATUS**: Not implemented.
- **PRODUCT_DECISION**: **Already decided**: `MIN_GUILD_MEMBERSHIP_DAYS_TO_VOTE = 7`. Combined with `MIN_CONTRIBUTION_TO_VOTE = TBD` (item 7), eligibility is conceptually: `canVote = membershipDays >= 7 AND contribution >= configuredMinimum`. Not implemented yet.
- **OPEN_QUESTIONS**: The Contribution minimum's actual value (depends on item 6/7).
- **BACKEND_IMPACT**: A membership-duration check (straightforward, `GuildMember.joinedAt`) plus the Contribution check once it exists.
- **FRONTEND_IMPACT**: Eligibility messaging on the ballot UI.
- **GAMEBRIDGE_DEPENDENCY**: None.
- **TELEMETRY_DEPENDENCY**: None.
- **SECURITY_CONCERNS**: The 7-day rule is the first anti-abuse barrier (see item 15); alone it doesn't stop determined multi-account abuse.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: Low for the membership-days check; blocked on item 6/7 for the full rule.

## 13. Candidacy Rules

- **FEATURE**: Rules for who may run for an elective guild role.
- **PURPOSE**: Prevent low-investment or bad-actor candidacies.
- **CURRENT_STATUS**: Not implemented.
- **PRODUCT_DECISION**: Rules **not yet defined**. Possible future factors: time in guild, Contribution, current role, activity, punishments/moderation history, others. Represent as `CANDIDACY_RULES = TBD`.
- **OPEN_QUESTIONS**: All of the above; interaction with existing account moderation/audit history.
- **BACKEND_IMPACT**: TBD, depends on chosen factors.
- **FRONTEND_IMPACT**: Candidacy submission UI with eligibility checks.
- **GAMEBRIDGE_DEPENDENCY**: None identified.
- **TELEMETRY_DEPENDENCY**: Possibly, for activity-based factors.
- **SECURITY_CONCERNS**: Same class as item 15.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: TBD.

## 14. Terms / Mandates

- **FEATURE**: Fixed-length terms for elective roles.
- **PURPOSE**: Give elected roles a defined tenure with a path to re-election.
- **CURRENT_STATUS**: Not implemented.
- **PRODUCT_DECISION**: Possible future options (none decided): 30/60/90 days, another configurable period, or permanent-until-next-election.
- **OPEN_QUESTIONS**: The actual value(s); whether it's global or per-guild-configurable.
- **BACKEND_IMPACT**: A term-length setting + scheduled re-election trigger.
- **FRONTEND_IMPACT**: Term display, re-election scheduling UI.
- **GAMEBRIDGE_DEPENDENCY**: None.
- **TELEMETRY_DEPENDENCY**: None.
- **SECURITY_CONCERNS**: None beyond the general elections concerns (item 15).
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: Low-medium once elections themselves exist.

## 15. Elections Anti-Abuse

- **FEATURE**: Abuse-resistance measures for the elections system.
- **PURPOSE**: Prevent the elections system from being gamed.
- **CURRENT_STATUS**: Not implemented (no elections exist). Only related existing infrastructure: the portal's general auth rate limiting (`AuthRateLimitService`) and the `RECRUIT` role concept already exist and could plausibly feed into a "recent joiner" signal later.
- **PRODUCT_DECISION**: Must eventually consider: alt accounts, joining recently just to vote, candidacy spam, multiple/duplicate voting, Contribution manipulation, others. The existing `MIN_GUILD_MEMBERSHIP_DAYS_TO_VOTE = 7` rule (item 12) is called out as a first barrier, not a complete solution. **A complete anti-abuse design is explicitly not being drafted now.**
- **OPEN_QUESTIONS**: Everything — this item exists to flag that the problem is real and unsolved, not to propose a solution.
- **BACKEND_IMPACT**: TBD.
- **FRONTEND_IMPACT**: TBD.
- **GAMEBRIDGE_DEPENDENCY**: Possibly, for alt-account detection tied to real account/IP/hardware signals.
- **TELEMETRY_DEPENDENCY**: Possibly.
- **SECURITY_CONCERNS**: This entire item IS the security concern for the elections system (items 8-14).
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: High / open-ended.

## 16. Guild Goals

- **FEATURE**: Periodic collective objectives for the guild.
- **PURPOSE**: Give the guild shared, time-boxed targets distinct from individual Guild Quests (item 17).
- **CURRENT_STATUS**: Not implemented. Explicitly **not the same thing** as the pre-existing `GuildRequest`/`GuildProject` models (resource asks and planning items), nor the same as item 17.
- **PRODUCT_DECISION**: Conceptual examples only, nothing decided: kill X bosses, complete X events, participate in X Castle Sieges, win X confrontations, reach a certain collective progression milestone, others.
- **OPEN_QUESTIONS**: Everything — scope, tracking mechanism, rewards, relationship to Guild Level (items 19-22) and Guild Activity (item 23).
- **BACKEND_IMPACT**: New domain model(s) entirely.
- **FRONTEND_IMPACT**: New UI surface.
- **GAMEBRIDGE_DEPENDENCY**: Likely YES for boss-kill/siege/PvP-tracked goals.
- **TELEMETRY_DEPENDENCY**: Possibly.
- **SECURITY_CONCERNS**: None identified yet.
- **BETA_CANDIDATE**: NO (explicitly listed under item 29's future/advanced systems).
- **COMPLEXITY**: High.

## 17. Guild Quests

- **FEATURE**: Quests specifically for the guild as a unit.
- **PURPOSE**: A distinct content type from Guild Goals (item 16) — described as a quest structure rather than a passive collective milestone.
- **CURRENT_STATUS**: Not implemented.
- **PRODUCT_DECISION**: May involve PvE, PvP, bosses, events, gathering, exploration, chained objectives, other content. Conceptual shape given: Guild Quest → kill specific mobs/bosses → complete objective → guild receives a reward.
- **OPEN_QUESTIONS**: Exact structure/authoring model; reward mechanism (feeds into item 18); relationship to Guild Goals (item 16) needs to stay distinct per the user's explicit note.
- **BACKEND_IMPACT**: New domain model(s) entirely.
- **FRONTEND_IMPACT**: New UI surface.
- **GAMEBRIDGE_DEPENDENCY**: Likely YES for most quest types.
- **TELEMETRY_DEPENDENCY**: Possibly.
- **SECURITY_CONCERNS**: None identified yet.
- **BETA_CANDIDATE**: NO (explicitly listed under item 29's future/advanced systems).
- **COMPLEXITY**: High.

## 18. Guild Resources

- **FEATURE**: A collective currency/resource pool earned through guild activities.
- **PURPOSE**: Give Guild Quests (item 17) and other activities a reward that belongs to the guild collectively, not an individual.
- **CURRENT_STATUS**: Not implemented as a new concept — but note `GuildTreasury`/`GuildTreasuryBalance` already exist as real, seeded (7 balances at guild creation), auditable, read-only tables (no deposit/withdrawal endpoint exists; confirmed PARTIAL/read-only in the Guild Step 5 audit). Whether "Guild Resources" reuses or extends that existing treasury model, or is a wholly separate concept, is undecided.
- **PRODUCT_DECISION**: Possible future uses: guild evolution, unlocks, cosmetics, social features, upgrades, Guild Quest costs, others. **No specific currency/resource is defined now.**
- **OPEN_QUESTIONS**: Relationship to the existing Treasury model (extend it vs. new system); the currency/resource itself.
- **BACKEND_IMPACT**: TBD — possibly extends `GuildTreasuryBalance`, possibly new.
- **FRONTEND_IMPACT**: New UI once resources are earnable/spendable (today's Treasury tab is read-only).
- **GAMEBRIDGE_DEPENDENCY**: Depends on the earning source (items 16/17).
- **TELEMETRY_DEPENDENCY**: Possibly.
- **SECURITY_CONCERNS**: Once any real currency movement exists, the same rigor applied to member/role/invite concurrency (Guild Steps 3-4) will need to apply to resource transactions.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: High.

## 19. Guild Level (future model)

- **FEATURE**: A more complete Guild Level progression system.
- **PURPOSE**: Give the guild itself a sense of growth beyond the current placeholder.
- **CURRENT_STATUS**: `Guild.guildLevel`/`Guild.guildXp` and an admin-managed `GuildLevelConfig` catalog already exist, but with explicitly placeholder, unbalanced numbers (per the schema's own module comment) and — per the Guild XP tab's own copy — no real conversion mechanism is active yet (a "Resource Sink" concept is described but not implemented; `GuildXpConversionRule` rows exist but nothing ever executes them, confirmed inert in `guilds-admin.service.ts`'s own comment).
- **PRODUCT_DECISION**: **Guild Level must not depend only on Contribution.** Progression should get gradually more complex as level increases.
- **OPEN_QUESHIONS**: Exact thresholds and requirements at every tier (see items 20-21, all explicitly undefined).
- **BACKEND_IMPACT**: A real leveling engine, replacing/activating the current inert placeholder.
- **FRONTEND_IMPACT**: Updated Guild Level/XP tabs reflecting real mechanics once they exist.
- **GAMEBRIDGE_DEPENDENCY**: Depends on which requirements are chosen (siege/boss-based ones would need it).
- **TELEMETRY_DEPENDENCY**: Possibly.
- **SECURITY_CONCERNS**: None identified yet.
- **BETA_CANDIDATE**: NO (explicitly listed under item 29's future/advanced systems).
- **COMPLEXITY**: High.

## 20. Early Guild Levels (Contribution-driven)

- **FEATURE**: The first few Guild Level thresholds (up to roughly Level 3).
- **PURPOSE**: Keep early progression simple and achievable.
- **CURRENT_STATUS**: Not implemented (see item 19).
- **PRODUCT_DECISION**: Up to approximately Guild Level 3, progression is relatively simple and based mainly on Contribution. Conceptual example only: Lv1→Lv2 requires some Contribution; Lv2→Lv3 requires more. **No values decided.**
- **OPEN_QUESTIONS**: The actual thresholds; depends on item 6 (Contribution) being real first.
- **BACKEND_IMPACT**: Simple threshold checks once Contribution exists.
- **FRONTEND_IMPACT**: Progress display.
- **GAMEBRIDGE_DEPENDENCY**: None beyond item 6's.
- **TELEMETRY_DEPENDENCY**: None beyond item 6's.
- **SECURITY_CONCERNS**: Inherits item 6's anti-manipulation concerns.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: Low once Contribution exists.

## 21. Advanced Guild Levels (activity-driven)

- **FEATURE**: Guild Level thresholds beyond the early tiers, requiring real activity.
- **PURPOSE**: Prevent a guild from maxing out its level through passive resource accumulation alone.
- **CURRENT_STATUS**: Not implemented.
- **PRODUCT_DECISION**: Beyond the early levels, leveling should require real activity, not just Contribution. Possible requirements: Contribution, Castle Siege participation, boss kills, event completion, Guild Quest completion, other collective feats. Conceptual example only: Lv3→Lv4 = Contribution + Boss Kills + Siege Participation. **No numbers decided.**
- **OPEN_QUESTIONS**: All thresholds; depends on items 16/17/23 existing for the activity signals.
- **BACKEND_IMPACT**: Significant, once dependencies exist.
- **FRONTEND_IMPACT**: Multi-requirement progress display.
- **GAMEBRIDGE_DEPENDENCY**: Likely YES (siege/boss data).
- **TELEMETRY_DEPENDENCY**: Possibly.
- **SECURITY_CONCERNS**: None identified yet beyond dependencies' own.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: High, blocked on multiple other backlog items.

## 22. Guild Level Principle (design constraint, not a feature)

- **FEATURE**: N/A — this is a standing design rule for items 19-21, recorded for future reference.
- **PURPOSE**: Prevent a guild from reaching max level through passive resource/Contribution accumulation alone.
- **CURRENT_STATUS**: N/A.
- **PRODUCT_DECISION**: Recorded verbatim rule: *"In the early levels, the guild grows mainly through Contribution. As it evolves, leveling up starts requiring real collective feats and guild activity."*
- **OPEN_QUESTIONS**: None — this is a principle, not a spec.
- **BACKEND_IMPACT**: N/A directly; governs how items 19-21 get built.
- **FRONTEND_IMPACT**: N/A directly.
- **GAMEBRIDGE_DEPENDENCY**: N/A.
- **TELEMETRY_DEPENDENCY**: N/A.
- **SECURITY_CONCERNS**: N/A.
- **BETA_CANDIDATE**: N/A.
- **COMPLEXITY**: N/A.

## 23. Guild Activity

- **FEATURE**: A composite "how active is this guild" signal.
- **PURPOSE**: Feed Advanced Guild Levels (item 21), member-activity views (item 2), and Directory filters (item 1).
- **CURRENT_STATUS**: Not implemented. No activity-tracking model exists for guilds today.
- **PRODUCT_DECISION**: May consider Siege, bosses, events, Guild Quests, PvP, member activity, others. **No scoring formula defined now.**
- **OPEN_QUESTIONS**: The entire formula; data sourcing for each signal.
- **BACKEND_IMPACT**: TBD, likely needs GameBridge/telemetry inputs for most signals.
- **FRONTEND_IMPACT**: Activity display in directory/member views.
- **GAMEBRIDGE_DEPENDENCY**: Likely YES for most signals.
- **TELEMETRY_DEPENDENCY**: Likely YES.
- **SECURITY_CONCERNS**: None identified yet.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: High.

## 24. Guild Achievements

- **FEATURE**: Milestone achievements for the guild, potentially shown publicly.
- **PURPOSE**: Give guilds recognizable, collectible accomplishments.
- **CURRENT_STATUS**: Not implemented. The current Members tab has an "Conquistas" (achievements) placeholder tab already noting neither individual nor collective achievements are connected to any rules engine yet.
- **PRODUCT_DECISION**: Possible examples: first Siege victory, a certain number of boss kills, member-count milestones, progression milestones, PvP, events, Guild Level, other feats. Achievements may appear on the public profile in the future.
- **OPEN_QUESTIONS**: The actual achievement catalog; public vs. private visibility rules.
- **BACKEND_IMPACT**: A rules engine + achievement catalog, entirely new.
- **FRONTEND_IMPACT**: Achievement display (profile, member views).
- **GAMEBRIDGE_DEPENDENCY**: Likely YES for most achievement types.
- **TELEMETRY_DEPENDENCY**: Possibly.
- **SECURITY_CONCERNS**: None identified yet.
- **BETA_CANDIDATE**: NO (explicitly listed under item 29's future/advanced systems).
- **COMPLEXITY**: High.

## 25. Guild History / Timeline

- **FEATURE**: A visible timeline of significant guild events.
- **PURPOSE**: Give the guild a sense of its own history.
- **CURRENT_STATUS**: Not implemented as a member-facing feature. The backend already emits a rich stream of operational/audit events for essentially every guild action (creation, profile updates, joins, invites, role changes, kicks, leadership transfers, and — as of Guild Step 5.5 — disband) via the existing `ObservabilityService`/`AuditService` infrastructure, but nothing surfaces any of it to members today (confirmed MISSING/P2 in the Guild Step 5 audit).
- **PRODUCT_DECISION**: Future timeline could show: guild created, leadership change, election concluded, member promoted, milestone, siege victory, achievement, guild level up, others. A future split between **PUBLIC EVENTS** vs. **INTERNAL EVENTS** is noted as a later decision. The existing audit backend should be evaluated for reuse before building anything new.
- **OPEN_QUESTIONS**: The public/internal split; retention/pagination for a potentially long history; which existing audit event types map directly vs. need new ones.
- **BACKEND_IMPACT**: Likely a read-oriented endpoint over existing audit/observability data, not a new event-capture system.
- **FRONTEND_IMPACT**: A new timeline UI surface.
- **GAMEBRIDGE_DEPENDENCY**: None beyond whatever future event types need it (e.g., siege victory).
- **TELEMETRY_DEPENDENCY**: None identified beyond existing observability.
- **SECURITY_CONCERNS**: Deciding the public/internal split carefully — some audit detail (e.g., kick reasons, step-up-gated actions) may not belong on a public timeline.
- **BETA_CANDIDATE**: NO (explicitly listed under item 29's future/advanced systems). Note: this is the same underlying gap flagged as `AUDIT_UI_STATUS = MISSING / P2` in the Guild Step 5 audit — this item is that gap's fuller product vision, still post-beta.
- **COMPLEXITY**: Medium (data mostly exists; the work is presentation, filtering, and the public/internal decision).

## 26. Member Rankings (multiple, independent)

- **FEATURE**: Several independent internal rankings: Power, Contribution, Activity, PvP, Progression.
- **PURPOSE**: Let each axis of member standing be viewed without conflating them.
- **CURRENT_STATUS**: Not implemented (depends on items 3, 6, 23, and PvP/Progression data not yet modeled at all).
- **PRODUCT_DECISION**: Each ranking must be independent. **Do not mix Power with Contribution** — they answer different questions (see item 6's framing) and must never be combined into one blended score.
- **OPEN_QUESTIONS**: PvP and Progression rankings have no defined data source yet at all.
- **BACKEND_IMPACT**: Depends entirely on items 3/6/23 plus new PvP/Progression tracking.
- **FRONTEND_IMPACT**: Multiple ranking views (ties into item 2).
- **GAMEBRIDGE_DEPENDENCY**: Likely YES for PvP.
- **TELEMETRY_DEPENDENCY**: Possibly for Activity/Progression.
- **SECURITY_CONCERNS**: None beyond each underlying metric's own.
- **BETA_CANDIDATE**: NO.
- **COMPLEXITY**: High (multiple new data sources).

## 27. Power Ties (tie-breaking is cosmetic only)

- **FEATURE**: Defined behavior when two characters tie on Power.
- **PURPOSE**: Avoid accidentally treating an arbitrary tie-break as a real power difference.
- **CURRENT_STATUS**: N/A (Power Ranking itself, item 3, is not implemented yet).
- **PRODUCT_DECISION**: If two characters have identical Reset, Level, and Gear Score, they are **equivalent in power**. A future *visual* tie-break (e.g., for stable list ordering) may exist, but it must never be presented as one having more power than the other. Explicitly: "who reached it first" must **not** be used as a power component.
- **OPEN_QUESTIONS**: What the cosmetic tie-break actually is, if one is added (e.g., alphabetical, join date — as long as it's labeled as a display tie-break, not a power claim).
- **BACKEND_IMPACT**: A stable secondary sort key for display purposes only, once item 3 is built.
- **FRONTEND_IMPACT**: Must not visually imply a power difference between tied entries.
- **GAMEBRIDGE_DEPENDENCY**: None.
- **TELEMETRY_DEPENDENCY**: None.
- **SECURITY_CONCERNS**: None identified.
- **BETA_CANDIDATE**: N/A (a rule that applies once item 3 ships, not a standalone deliverable).
- **COMPLEXITY**: Low.

## 28. Directory + Product Identity

- **FEATURE**: Show each guild's declared/derived "identity" (e.g., PvP/Siege-focused, PvE/Boss-focused, Events/Progression-focused) in directory and profile.
- **PURPOSE**: Help players find a guild that matches their playstyle at a glance.
- **CURRENT_STATUS**: `GuildFocusTag` already exists (PVP, PVE, CASTLE_SIEGE, BOSS, FARM, EVENTS, CASUAL, COMPETITIVE) and is already settable via the profile editor (Guild Step 1) and filterable in the directory — but it's a flat multi-select tag list today, not a derived "identity" that also draws on achievements/activity/history.
- **PRODUCT_DECISION**: Future identity could be derived from: declared focus (already exists), achievements (item 24), real activity (item 23), history (item 25). Not implementing the derivation now — current flat focus-tag system stands as-is for beta.
- **OPEN_QUESTIONS**: Whether "identity" becomes a single derived label, a richer multi-signal badge set, or stays as the current flat tag list indefinitely.
- **BACKEND_IMPACT**: None until derivation logic is designed; depends on items 23/24/25.
- **FRONTEND_IMPACT**: Directory/profile display once derivation exists.
- **GAMEBRIDGE_DEPENDENCY**: Inherits items 23/24's.
- **TELEMETRY_DEPENDENCY**: Inherits items 23/24's.
- **SECURITY_CONCERNS**: None identified.
- **BETA_CANDIDATE**: NO for the *derived* identity concept. The underlying flat focus-tag system is already shipped and is itself a beta feature (Guild Step 1), just not this richer derivation.
- **COMPLEXITY**: Medium, blocked on items 23-25.

## 29. Beta vs. Future — Prioritization Snapshot

Not a feature — a classification snapshot as given, to guide future prioritization. **Not a final, binding priority order**; the user has not closed on a definitive sequence and reserves that decision.

**Closer/simpler candidates** (named as such, not yet scheduled):
- Richer directory (item 1)
- Filters (item 1)
- Guild focus (item 28's underlying tag system — already shipped)
- Guild message (item 1, new field)
- Recruitment status (already shipped, Guild Steps 1/5)
- Member list (already shipped, Guild Step 3; item 2's alternate views are the new part)
- Simple Reset/Level rankings (item 3, Gear-less version)

**More advanced/future systems**:
- Elections (items 8-15)
- Contribution formula (item 6)
- Guild Quests (item 17)
- Guild Resources (item 18)
- Advanced Guild Level (items 19, 21)
- Achievements (item 24)
- History (item 25)
- Gear Score (item 4)
- Seasons (not otherwise detailed in this backlog — recorded here only because it was named in this classification; no further spec given)
- Advanced rankings (item 26)

---

## Format Key (for reference, per item above)

Each item above follows: FEATURE, PURPOSE, CURRENT_STATUS, PRODUCT_DECISION, OPEN_QUESTIONS, BACKEND_IMPACT, FRONTEND_IMPACT, GAMEBRIDGE_DEPENDENCY, TELEMETRY_DEPENDENCY, SECURITY_CONCERNS, BETA_CANDIDATE, COMPLEXITY.

## Status Discipline

Every item in this document is DESIGN / BACKLOG / FUTURE unless its CURRENT_STATUS explicitly says otherwise (and even then, only the already-shipped *sub-piece* is marked as such — the new capability described by the item itself remains backlog). Do not promote any item to IMPLEMENTED without a real code change backing it.
