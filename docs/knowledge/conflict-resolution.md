# Conflict resolution

What happens when two sources disagree.

## The rule

**Never silently pick a winner.** When two captured sources make contradictory claims about the same thing, both stay recorded, and the disagreement itself becomes a tracked `CONFLICT` entry with:

- both sources (with their authority level and confidence, per [source-authority.md](source-authority.md))
- the specific claim each makes
- a plausible reason for the divergence, if one is apparent: different Season, different server pack, different custom config, an outdated tutorial, a provider change over time, or a plain mistake in one source
- current status: unresolved, or resolved-with-reasoning (never resolved-by-just-trusting-the-higher-authority-source without stating why)

## Higher authority narrows the conflict, it doesn't erase it

If a `PROVIDER_TUTORIAL` says a system works one way and a later `REAL_BLOODMOON_CONFIG` read shows it configured differently, the correct record is: "the tutorial describes the vendor's generic default; Blood Moon's actual config diverges as follows: ___" — not deletion of the tutorial's claim. The tutorial might still be exactly right about *mechanics* (how the feature behaves once triggered) while being wrong about *this server's specific tuning* (what values are actually set). Collapsing those two into "the tutorial was wrong, ignore it" throws away real information.

## Version/Season discipline

A claim from a Season 20 video is never merged into Season 6 knowledge without an explicit note that a version gap exists. Every captured source should carry, where determinable: Season/episode, provider, server-version, and capture/publish date. See each entry's `sourceDate` field in `knowledge/vendor-sweep/knowledge-index.json`.

## No conflicts found yet

As of the 2026-08-25 sweep, no direct contradictions have been identified between newly-captured sources and existing Blood Moon documentation — the new captures (Custom Bot Store/Trader/Fusion, ItemDrop VIP columns, the Data/ folder taxonomy, GameMaster account-level whitelisting) are net-new systems/orientation material, not re-descriptions of something already documented differently elsewhere. The one item flagged for a future cross-check — whether Blood Moon's real `ItemDrop.txt` actually has the 4 VIP-tier columns described in the `DqHAEmyQCjA` transcript — is a **verification gap**, not yet a confirmed conflict (see `knowledge/vendor-sweep/reference-gap-manifest.json`, GAP-001 detail, and `knowledge-index.json` entry KI-004).
