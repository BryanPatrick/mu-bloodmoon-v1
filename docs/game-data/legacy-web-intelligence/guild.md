# Guild — legacy evidence

Previously entirely `UNKNOWN` in the schema catalog. Every table/column
below is new.

## `Guild`

| Column | Meaning | Evidence |
|---|---|---|
| `G_Name` | Primary identifier, used as the join key everywhere | `load_guild_info()`, `get_guild_info()`, all guild queries |
| `G_Mark` | Guild emblem/mark | `load_guild_info()` |
| `G_Master` | Guild master's character name | `get_guild_info()` |
| `G_Score` | Guild ranking score — real `ORDER BY` column in `load_guild_rankings()` | `model.rankings.php::load_guild_rankings()` |
| `Number`, `G_Union` | Guild-alliance columns — `G_Union` is a self-join key (`SELECT G_Name FROM Guild WHERE G_Union=:number AND G_Name != :name`) for finding allied guilds | `get_guild_info()`, gated behind `MU_VERSION >= 1` (true for this install, `MU_VERSION=2`) |
| `G_Notice` | Guild notice text (appears in a `GROUP BY`, not otherwise queried directly) | `load_guild_rankings()` |

## `GuildMember`

| Column | Meaning | Evidence |
|---|---|---|
| `Name` | Character name — **the only link to `Character`**, via `GuildMember.Name = Character.Name`. There is no `AccountId` column on `GuildMember`. | `get_guild_members()`: `... FROM GuildMember AS g INNER JOIN Character AS c ON g.Name=c.Name ...` |
| `G_Name` | Foreign key to `Guild.G_Name` | same |
| `G_Status` | Member rank/position within the guild (member vs. officer vs. master) | `get_guild_members()`: `ORDER BY g.G_Status DESC` |

## Castle Siege ownership (guild-adjacent, separate tables)

| Table | Columns | Meaning |
|---|---|---|
| `MuCastle_DATA` | `owner_guild` (→ `Guild.G_Name`), `siege_start_date`, `siege_end_date`, `money`, `tax_rate_chaos`, `tax_rate_store`, `tax_hunt_zone` | Current castle-owning guild and siege economy state |
| `MuCastle_REG_SIEGE` | `SEQ_NUM`, `REG_SIEGE_GUILD` (→ `Guild.G_Name`), `REG_MARKS`, `IS_GIVEUP` | Siege registration list for the upcoming siege |

## No AdminCP guild manager

Verified by grepping `controller.admincp.php`/`model.admin.php` for every
guild-related identifier: the only admin-side guild code is a dashboard
count (`total_guilds()`: `SELECT COUNT(G_Name) AS count FROM Guild`). All
real guild read logic lives in the public `info`/`rankings` controllers.

## Cross-reference against `docs/game-data/schema/`

All of the above is **NEW_LEGACY_EVIDENCE** — the schema catalog previously
had zero guild-side entries (the Global Portal Audit explicitly listed
"Guild game-side" as PARTIAL/legacy-AdminCP-menu-names-only). This is the
first real code-level evidence for it. This unblocks a meaningful chunk of
`docs/game-data/schema/join-keys-unknown.md`'s guild-related gaps, subject
to the same rule as everything else here: LEGACY_CODE_OBSERVED, not
SCHEMA_CONFIRMED, until validated against the live database.
