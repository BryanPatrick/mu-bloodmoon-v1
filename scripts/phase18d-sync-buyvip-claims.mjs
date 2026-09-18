#!/usr/bin/env node
// Phase 18D -- one-time, idempotent sync of the 3 manually-read priority videos
// (gqtSk1pdti4, Jia1TrtgZfY, XUeN6U74zME) into the vendor-sweep machine
// artifacts, following knowledge/vendor-sweep/checkpoint.json's own documented
// pattern (an agent reads the RAW transcript, writes claims/index entries, then
// the three generators are re-run). There is no automated claim-extractor in
// scripts/knowledge-*.mjs -- extraction has always been agent-authored.
//
// Evidence order (Phase 18D Part 6): RAW transcript > real Blood Moon config >
// reviewed interpretation. Claims were checked against a second, blind
// extraction of the same transcripts and against the preserved real config.
//
// Touches: knowledge-index.json, atomic-claims.json, knowledge-graph.json,
// verification-queue.json, checkpoint.json. Does NOT touch generator-owned
// files (transcript-inventory, priority-queues, canonical-facts,
// provenance-report) -- re-run those generators afterwards.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'knowledge', 'vendor-sweep')
const now = new Date().toISOString()
const load = (n) => JSON.parse(readFileSync(join(ROOT, n), 'utf8'))
const save = (n, d) => writeFileSync(join(ROOT, n), JSON.stringify(d, null, 2) + '\n')

// knowledge-index.json mixes inline and expanded arrays; re-serializing it would rewrite
// ~100 unrelated lines. Insert the new entries as text instead (entries is the last key).
function appendEntriesText(name, items, generatedAt) {
	if (!items.length) return
	const p = join(ROOT, name)
	let text = readFileSync(p, 'utf8')
	const close = text.lastIndexOf('\n  ]\n}')
	if (close === -1) throw new Error(`unexpected ${name} layout`)
	const body = items.map((i) => JSON.stringify(i, null, 2).split('\n').map((l) => '    ' + l).join('\n')).join(',\n')
	text = text.slice(0, close) + ',\n' + body + text.slice(close)
	text = text.replace(/("generatedAt":\s*")[^"]+(")/, `$1${generatedAt}$2`)
	writeFileSync(p, text)
}

const index = load('knowledge-index.json')
const claimsDoc = load('atomic-claims.json')
const graph = load('knowledge-graph.json')
const queue = load('verification-queue.json')
const checkpoint = load('checkpoint.json')

const REAL = 'real-config-read'
const YT = 'Research/YouTube/project-gamers-oficial/transcripts'
const SNAP = 'preserved snapshot: Buy Vip block byte-identical in the Phase 6 download (2026-08-27) and the Phase 11 download (2026-08-29); not re-read live in Phase 18D'
const CMD_SHA = '9d971e9f30038bdadedb302a27830b6296deb48cb9bf01ac0cb61a9a3d5b15d7'
const CBVC_SHA = '9a9fe8a6d98b6fb741dc27c0274749d04383b8f0b91c2a2473300e0aff62bf8a'
const MSG_SHA = '712f6a4743aa47b86c72077baf2a55182ef86a77e17de23c220926bda8c61438'

// ---------------------------------------------------------------- KI entries
const kiCommon = {
	sourceType: 'YOUTUBE_VIDEO',
	sourceAuthority: 'PROVIDER_TUTORIAL',
	category: 'systems',
	provider: 'ProjectGamers/eMuGS',
	channel: 'ProjectGamers Developers',
	channelUrl: 'https://www.youtube.com/@projectgamersoficial',
	transcriptLanguage: 'pt-BR',
	transcriptQuality: 'YouTube auto-generated captions (ASR); several passages garbled',
	derivedArtifacts: [],
	status: 'BLOODMOON_LIKELY',
	lastVerified: '2026-09-18'
}

const newKi = [
	{
		id: 'KI-042',
		title: 'Custom Buy Vip -- in-game VIP purchase button (ADDED 8.3)',
		videoId: 'gqtSk1pdti4',
		season: '6.17 (demo; vendor says it works on all versions)',
		providerVersion: 'ADDED 8.3',
		rawArtifact: `${YT}/gqtSk1pdti4.pt.json`,
		normalizedArtifact: 'mu-bloodmoon-v1/docs/knowledge/CASH_VIP_INTEGRATION_MAP.md (Part 1)',
		tags: ['buy_vip', 'buyvip', 'custom_buy_vip', 'vip', 'cash', 'wcoin', 'wcoinc', 'wcoinp', 'goblinpoint', 'coin', 'game_currency', 'in-game-purchase', 'command', 'reload'],
		entities: ['CustomBuyVip', 'CommandBuyVip', 'GameServerInfo - Command.dat'],
		capturedAt: '2026-08-27T01:02:40.407Z',
		sourceDate: '2024-12-17',
		confidence: 'CONFIRMED_VENDOR_VIDEO (claims) + CONFIRMED_RUNTIME (config structure only -- behavior unverified on Blood Moon)',
		verifiedNote: 'Phase 18D (2026-09-18): read directly in Phase 18C, then formally registered and cross-checked against a blind second extraction and Blood Moon\'s preserved real config (CLAIM-100/101/103/104). See atomic-claims.json CLAIM-100..110 and docs/knowledge/CASH_VIP_INTEGRATION_MAP.md.'
	},
	{
		id: 'KI-043',
		title: 'Command Buy Vip Check User -- already-VIP stacking-bug fix (UPDATED 8.2)',
		videoId: 'Jia1TrtgZfY',
		season: null,
		providerVersion: 'UPDATED 8.2',
		rawArtifact: `${YT}/Jia1TrtgZfY.pt.json`,
		normalizedArtifact: 'mu-bloodmoon-v1/docs/knowledge/CASH_VIP_INTEGRATION_MAP.md (Part 1)',
		tags: ['buy_vip', 'buyvip', 'custom_buy_vip', 'vip', 'cash', 'wcoin', 'coin', 'game_currency', 'command', 'bugfix', 'check-user'],
		entities: ['CustomBuyVip', 'CommandBuyVip', 'CommandBuyVipCheckUserSwitch'],
		capturedAt: '2026-08-27T01:02:56.622Z',
		sourceDate: '2024-11-04',
		confidence: 'CONFIRMED_VENDOR_VIDEO (claims) + CONFIRMED_RUNTIME (the CheckUserSwitch field exists in Blood Moon\'s config)',
		verifiedNote: 'Phase 18D (2026-09-18): chronologically PRECEDES KI-042 (8.2 < 8.3) -- the same command system, one iteration earlier. No season is stated in the video. See CLAIM-100, 103, 105, 106, 107, 108.'
	},
	{
		id: 'KI-044',
		title: 'Custom Buy Vip And Coin -- generic NPC item-purchase reward engine, skill delivery (UPDATED 7.7)',
		videoId: 'XUeN6U74zME',
		season: '4.6 (demo; vendor says it works on all versions but is rarely used on recent ones -- audio garbled)',
		providerVersion: 'UPDATED 7.7',
		rawArtifact: `${YT}/XUeN6U74zME.pt.json`,
		normalizedArtifact: 'mu-bloodmoon-v1/docs/knowledge/CASH_VIP_INTEGRATION_MAP.md (Part 1)',
		tags: ['custom_buy_vip_and_coin', 'custom_buy_vip', 'vip', 'coin', 'wcoin', 'cash', 'game_currency', 'npc', 'skill-delivery', 'shop', 'reload'],
		entities: ['CustomBuyVipAndCoin', 'Data/Custom/'],
		capturedAt: '2026-08-27T01:06:30.326Z',
		sourceDate: '2023-10-19',
		confidence: 'CONFIRMED_VENDOR_VIDEO (claims) + CONFIRMED_RUNTIME (file structure only -- behavior unverified on Blood Moon, and Blood Moon\'s copy is inert)',
		verifiedNote: 'Phase 18D (2026-09-18): see CLAIM-111..118. The presenter references a separate earlier video for the pre-7.7 part of this file; that is probably FHPFZmqyDqI (ADDED 7.0, unprocessed) -- an inference, not stated in the audio.'
	}
]

// -------------------------------------------------------------------- claims
const C = (o) => ({ season: null, providerVersion: null, verificationTargets: [], notes: null, ...o })

const newClaims = [
	C({
		claimId: 'CLAIM-100',
		statement: 'Blood Moon\'s GameServerInfo - Command.dat contains a "Command Buy Vip Settings" block for the native in-game /buyvip <tipo> <dias> command, with three VIP slots (Vip1-3) that each carry three currency price values (PriceValue1-3).',
		sourceId: `${REAL} (corroborated by KI-042, KI-043)`,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `RemoteData/Phase11/GameServerInfo - Command.dat lines 514-536 (sha256 ${CMD_SHA}; block identical in RemoteData/Phase6/GameServerInfo-Command.dat); syntax and messages: RemoteData/Phase10/Message.txt ids 815-820 (sha256 ${MSG_SHA}); vendor corroboration: gqtSk1pdti4 1:23-1:52, Jia1TrtgZfY 1:42-2:36`,
		entityTypes: ['SYSTEM', 'COMMAND', 'CONFIG'],
		entities: ['CustomBuyVip', 'CommandBuyVip', 'GameServerInfo - Command.dat'],
		topic: 'commands',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'GameServer/DATA/GameServerInfo - Command.dat' }, { type: 'file_read', path: 'Data/Message.txt' }],
		confidence: `CONFIRMED_RUNTIME (${SNAP})`,
		notes: 'Other fields of the block: CommandBuyVipSwitch, CommandBuyVipEnable_AL0-3, CommandBuyVipMoney_AL0-3 (a zen requirement, message 818), CommandBuyVipMinDays, CommandBuyVipMaxDays, CommandBuyVipCheckUserSwitch. Corrects the loose "Data/Command" wording used in the Phase 18C doc: on Blood Moon the settings live in GameServer\\DATA\\GameServerInfo - Command.dat (Data\\Command is not a folder -- see checkpoint.json Phase 6). The block contains CheckUserSwitch, the option vendor update 8.2 introduced (KI-043), so Blood Moon\'s build supports at least the 8.2 check; whether it includes the 8.3 in-game button (CLAIM-102) is UNKNOWN. Blind re-extraction check: gqt.10/gqt.11, jia.08.'
	}),
	C({
		claimId: 'CLAIM-101',
		statement: 'In the preserved snapshots of Blood Moon\'s config the native /buyvip command is present but disabled and unconfigured: CommandBuyVipSwitch = 0, all four CommandBuyVipEnable_AL flags = 0, all nine VIP price values = 0 and CommandBuyVipCheckUserSwitch = 0 (only CommandBuyVipMinDays = 15 and CommandBuyVipMaxDays = 30 hold non-zero values).',
		sourceId: REAL,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `RemoteData/Phase11/GameServerInfo - Command.readable.txt lines 516-536 (sha256 ${CMD_SHA}); identical block in RemoteData/Phase6/GameServerInfo-Command.utf8.txt`,
		entityTypes: ['SYSTEM', 'COMMAND', 'CONFIG'],
		entities: ['CustomBuyVip', 'CommandBuyVip', 'GameServerInfo - Command.dat'],
		topic: 'commands',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'GameServer/DATA/GameServerInfo - Command.dat' }],
		confidence: `CONFIRMED_RUNTIME (${SNAP})`,
		notes: 'Live state was not re-read after the 2026-08-29 download. Already recorded in docs/vip/vip-deep-audit.md (CommandBuyVipSwitch = 0). Closes the Phase 18C open item "Blood Moon\'s own usage status not independently verified": the in-game Buy Vip is not an active purchase path on Blood Moon. If it were ever enabled from this file as-is, the already-VIP protection (CLAIM-106) would be OFF.'
	}),
	C({
		claimId: 'CLAIM-102',
		statement: 'Vendor update 8.3 added an in-game menu button that buys a VIP without typing the /buyvip command; it works only while both the in-game menu and the Buy Vip system are enabled server-side.',
		sourceId: 'KI-042',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/gqtSk1pdti4.pt.json segments 0:03-0:28 (button), 1:04-1:23 (menu and system must be enabled), 4:34-4:54 (button and command behave the same)`,
		entityTypes: ['SYSTEM', 'COMMAND'],
		entities: ['CustomBuyVip'],
		topic: 'commands',
		season: '6.17 (demo; vendor says it works on all versions)',
		providerVersion: 'ADDED 8.3',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'GameServer build/version vs vendor update 8.3 -- no non-production instance exists' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'Blood Moon\'s GameServer build relative to vendor update 8.3 is not established (CLAIM-100 only bounds it to >= 8.2). Blind check: gqt.01, gqt.08, gqt.09, gqt.28.'
	}),
	C({
		claimId: 'CLAIM-103',
		statement: 'The native /buyvip command prices each VIP slot in three currencies (WCoinC, WCoinP, GoblinPoint) and refuses the purchase when the caller\'s balances are insufficient: Blood Moon\'s message table (id 819) reports the caller\'s WCoinC/WCoinP/GoblinPoint balances against the VIP price in the same three currencies.',
		sourceId: `${REAL} (corroborated by KI-042, KI-043)`,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `RemoteData/Phase10/Message.txt id 819 (sha256 ${MSG_SHA}); RemoteData/Phase11/GameServerInfo - Command.dat PriceValue1-3 fields; vendor: gqtSk1pdti4 1:34-1:52 and 5:31-5:53 (needs coins or it will not buy), Jia1TrtgZfY 2:08-2:26`,
		entityTypes: ['SYSTEM', 'COMMAND', 'CURRENCY'],
		entities: ['CustomBuyVip', 'WCoinC', 'WCoinP', 'GoblinPoint'],
		topic: 'commands',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'Data/Message.txt' }],
		confidence: `CONFIRMED_RUNTIME (${SNAP.replace('Buy Vip block', 'message table and Buy Vip block')})`,
		notes: 'The presenter equates these with "Cash, Gold, PC Point" (spoken "ou"), but never maps them one-to-one; Blood Moon\'s own config and messages use only the WCoinC/WCoinP/GoblinPoint names. Other claims in this base (CLAIM-043, CLAIM-053) list Cash/Gold/PcPoint as separate options next to WCoin/GoblinPoint, so the equivalence is UNRESOLVED (GAP-P18-11). The order of message 819 suggests PriceValue1/2/3 = WCoinC/WCoinP/GoblinPoint, but no file states it. The Phase 18C wording "same underlying triple" overstated the source and is corrected here. Blind check: gqt.11, gqt.12, gqt.30, jia.11.'
	}),
	C({
		claimId: 'CLAIM-104',
		statement: 'The native /buyvip mechanism is a spend-only, in-game exchange of game currency the player already holds: its config block has no payment-gateway or URL field (unlike CustomPix, which carries a URL), and the vendor presents the default priced currency as the "donate" currency obtained elsewhere; it does not itself ingest real money.',
		sourceId: `${REAL} (corroborated by KI-042)`,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `RemoteData/Phase11/GameServerInfo - Command.dat lines 514-536 (block contents); vendor: gqtSk1pdti4 2:51-2:59 (main coin = donate currency)`,
		entityTypes: ['SYSTEM', 'COMMAND', 'CURRENCY'],
		entities: ['CustomBuyVip', 'WCoinC', 'CustomPix'],
		topic: 'commands',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'GameServer/DATA/GameServerInfo - Command.dat' }],
		confidence: `CONFIRMED_RUNTIME (block structure; ${SNAP}) / CONFIRMED_VENDOR_VIDEO (donate-currency remark)`,
		notes: 'The "not real money" conclusion rests on the block structure plus the vendor remark; the engine is closed-source, so the absence of any other money path cannot be proven from code. It is the spend side of the Cash flow: the real-money entry point is the legacy web donation flow (docs/knowledge/LEGACY_SUPPLIER_INDEX.md) or the never-configured CustomPix (CLAIM-098). Never conflate the two.'
	}),
	C({
		claimId: 'CLAIM-105',
		statement: '/buyvip pricing is a per-day unit price multiplied by the number of days purchased (unit 1: 15 days costs 15 and 30 days costs 30; unit 2: 30 and 60; unit 3: 45 and 90), not a flat per-tier price.',
		sourceId: 'KI-042 + KI-043',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/gqtSk1pdti4.pt.json segments 2:51-3:35 (worked prices); ${YT}/Jia1TrtgZfY.pt.json segments 3:32-3:55 (explicit "it multiplies")`,
		entityTypes: ['SYSTEM', 'COMMAND', 'CONFIG'],
		entities: ['CustomBuyVip'],
		topic: 'commands',
		providerVersion: 'ADDED 8.3 / UPDATED 8.2',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'per-day pricing arithmetic -- config only shows PriceValue fields' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'One canonical claim with two supporting videos (deduplicated per Phase 18D Part 10). Blood Moon\'s config shows only the PriceValue fields, so the per-day arithmetic itself is vendor-stated. Blind check: gqt.21-23, jia.17.'
	}),
	C({
		claimId: 'CLAIM-106',
		statement: 'The check-user option (CommandBuyVipCheckUserSwitch) makes /buyvip refuse a purchase while the player already holds any VIP, until it expires or an administrator removes it; the vendor recommends keeping it enabled.',
		sourceId: 'KI-042 + KI-043',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/gqtSk1pdti4.pt.json segments 1:54-2:20; ${YT}/Jia1TrtgZfY.pt.json segments 0:19-0:30 and 2:03-2:11`,
		entityTypes: ['SYSTEM', 'COMMAND', 'CONFIG'],
		entities: ['CustomBuyVip', 'CommandBuyVipCheckUserSwitch'],
		topic: 'commands',
		providerVersion: 'UPDATED 8.2 / ADDED 8.3',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'blocked-purchase behavior -- no non-production instance exists' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'The field exists in Blood Moon\'s Command.dat with value 0 (CLAIM-101); the behavior is vendor-demonstrated only. NOT STATED in either video: whether renewing the same tier is blocked (the 8.2 wording is "nenhum outro tipo" -- no OTHER type) and which field decides "is VIP". Blind check: gqt.13-15, jia.04, jia.10.'
	}),
	C({
		claimId: 'CLAIM-107',
		statement: 'In vendor releases before update 8.2, a player holding 30 days of VIP Silver who bought 1 day of VIP Gold ended up with 30 days of VIP Gold (the remaining Silver days carried over to the higher tier).',
		sourceId: 'KI-043',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/Jia1TrtgZfY.pt.json segments 0:37-0:52 (the bug), 3:09-3:19 (worked example)`,
		entityTypes: ['SYSTEM', 'COMMAND'],
		entities: ['CustomBuyVip'],
		topic: 'commands',
		providerVersion: 'UPDATED 8.2',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'The presenter says "days are summed" but his own example (1 day Gold on 30 days Silver -> 30, "not 31") shows a carry-over, not an addition; the Phase 18C wording "summed additively" is corrected here. Same design concern as CLAIM-091 (a VIP reward configured separately for players who already hold a higher tier). Blind check: jia.05, jia.13, jia.15.'
	}),
	C({
		claimId: 'CLAIM-108',
		statement: 'The vendor described the 8.2 already-VIP check as an interim stopgap and stated that the intended future behavior is for a tier-upgrade purchase to yield only the newly bought days (1 day of Gold over 30 days of Silver = 1 day, not 31).',
		sourceId: 'KI-043',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/Jia1TrtgZfY.pt.json segments 0:16-0:21 ("por enquanto"), 2:57-3:19 (may disappear; intended behavior), 3:19-3:32`,
		entityTypes: ['SYSTEM', 'COMMAND'],
		entities: ['CustomBuyVip'],
		topic: 'commands',
		providerVersion: 'UPDATED 8.2',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'A statement of vendor intent, not verifiable behavior. Version context: the later 8.3 video (KI-042) still recommends keeping the check enabled, so it had not been removed by 8.3; whether any later update changed it is UNKNOWN. Blind check: jia.03, jia.14, jia.15.'
	}),
	C({
		claimId: 'CLAIM-109',
		statement: 'In update 8.3 the in-game purchase menu shows all three VIP options with prices; the vendor\'s interim way to keep an unsold VIP from being bought is a very high price, and disabling the buttons of unsold VIPs according to the command config was announced as future work.',
		sourceId: 'KI-042',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/gqtSk1pdti4.pt.json segments 4:04-4:30 (tooltip prices), 7:03-7:38 (workaround and planned change)`,
		entityTypes: ['SYSTEM', 'COMMAND'],
		entities: ['CustomBuyVip'],
		topic: 'commands',
		season: '6.17 (demo)',
		providerVersion: 'ADDED 8.3',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'Version-specific (8.3): the presenter also says the button\'s day options are fixed at 15/30 "for now" and will be read from config in a later update (gqt.03, gqt.34, gqt.35); whether the tooltip prices come from config or are hard-coded in 8.3 is NOT STATED.'
	}),
	C({
		claimId: 'CLAIM-110',
		statement: 'A change to the Buy Vip settings is applied from the GameServer Startup window\'s Reloads list with "Reload Comand" (the command reload), demonstrated without any server restart being shown or stated as required.',
		sourceId: 'KI-042',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/gqtSk1pdti4.pt.json segments 3:35-3:57`,
		entityTypes: ['SYSTEM', 'OPERATIONS'],
		entities: ['CustomBuyVip', 'GameServer', 'GameServerInfo - Command.dat'],
		topic: 'operations',
		providerVersion: 'ADDED 8.3',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'Reload Comand on a non-production GameServer -- none exists' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'Vendor-demonstrated, NOT tested on Blood Moon\'s own instance -- "LIVE_RELOAD_CONFIRMED" in earlier docs means exactly this. Scope: the command-config family only (see CLAIM-120). The server was closed in the video only to edit SQL. A further reload item is ASR-rendered "Charter" and is unresolved (gqt.25). Blind check: gqt.24.'
	}),
	C({
		claimId: 'CLAIM-111',
		statement: 'CustomBuyVipAndCoin.txt has two sections: section 0 (columns ItemType, ItemIndex, ItemLevel, ItemInvDel, AccountLevelSwitch, AccountLevelType, AccountLevelDays, CoinSwitch, WCoinC, WCoinP, GoblinPoint, Name) and section 1 (columns Class, ItemType, ItemIndex, ItemLevel, ItemInvDel, Name).',
		sourceId: `${REAL} (corroborated by KI-044)`,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `RemoteData/Phase11/CustomBuyVipAndCoin.txt column-header comments (sha256 ${CBVC_SHA}); vendor: XUeN6U74zME 1:37-2:07`,
		entityTypes: ['SYSTEM', 'CONFIG'],
		entities: ['CustomBuyVipAndCoin', 'Data/Custom/'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'Data/Custom/CustomBuyVipAndCoin.txt' }],
		confidence: 'CONFIRMED_RUNTIME (preserved Phase 11 download, 2026-08-29; not re-read live in Phase 18D)',
		notes: 'Structure only -- the file\'s rows are all commented out on Blood Moon (CLAIM-118). The ItemInvDel column is the delete-after-use flag the presenter describes (his spoken field name is ASR-garbled, "item let inventario"); the mapping is inferred from the column name plus his description. Blind check: xue.05-08, xue.18.'
	}),
	C({
		claimId: 'CLAIM-112',
		statement: 'Section 0 of CustomBuyVipAndCoin.txt makes buying a configured item grant either a coin amount or an account-level (VIP) grant of a set type and number of days -- the function the file had before the 7.7 update.',
		sourceId: 'KI-044',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/XUeN6U74zME.pt.json segments 1:37-1:55`,
		entityTypes: ['SYSTEM', 'NPC', 'CONFIG'],
		entities: ['CustomBuyVipAndCoin'],
		topic: 'systems',
		season: '4.6 (demo; vendor says it works on all versions)',
		providerVersion: 'UPDATED 7.7',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'an enabled section-0 row on a non-production GameServer -- none exists' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'The column names in Blood Moon\'s own file (AccountLevelType, AccountLevelDays, CoinSwitch, WCoinC/WCoinP/GoblinPoint -- CLAIM-111) are consistent with this description, but the behavior was never run. Unlike /buyvip this is an item-triggered grant (an NPC/shop purchase), not a currency-priced command. The presenter says a separate video already covers this part -- probably FHPFZmqyDqI (ADDED 7.0, unprocessed); that identification is an inference. Blind check: xue.05, xue.07.'
	}),
	C({
		claimId: 'CLAIM-113',
		statement: 'Section 1 of CustomBuyVipAndCoin.txt delivers a skill to a class when the matching item is bought: in the demonstration a Blade Knight who buys the ItemLevel 1 "Orb of Fire Slash" (item 12/16) learns Fire Slash immediately -- a skill normally exclusive to Magic Gladiator -- and the item is removed per its ItemInvDel flag, while the ItemLevel 0 orb does nothing for a Blade Knight.',
		sourceId: 'KI-044',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/XUeN6U74zME.pt.json segments 2:07-2:36, 3:20-3:36, 4:33-4:59, 5:53-6:39`,
		entityTypes: ['SYSTEM', 'ITEM', 'SKILL'],
		entities: ['CustomBuyVipAndCoin', 'Fire Slash'],
		topic: 'systems',
		season: '4.6 (demo; vendor says it works on all versions but is rarely used on recent ones -- audio garbled)',
		providerVersion: 'UPDATED 7.7',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'skill delivery on a non-production GameServer -- none exists' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'Proves the reward mechanism is not limited to VIP/coins, using one concrete example. Blood Moon\'s commented template row is "Class 1, 12/16, ItemLevel 0, ItemInvDel 1 //Orb of Fire Slash" (CLAIM-118): its item indices match the demo, but its ItemLevel is 0 whereas the presenter recommends 1 so the Blade Knight orb differs from the Magic Gladiator\'s level-0 orb -- an inference: enabling the template unchanged would collide with the MG item. Item removal after use is stated but not shown (xue.21). Blind check: xue.10, xue.11, xue.15, xue.19-21.'
	}),
	C({
		claimId: 'CLAIM-114',
		statement: 'For a class-skill delivery row to work, the skill must also be enabled for the target class in the server\'s skill.txt (demonstrated with skill 55, Fire Slash, for Blade Knight); no edit to item.bmd or item.txt is needed.',
		sourceId: 'KI-044',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/XUeN6U74zME.pt.json segments 6:44-7:21`,
		entityTypes: ['SYSTEM', 'CONFIG', 'SKILL'],
		entities: ['CustomBuyVipAndCoin', 'skill.txt'],
		topic: 'systems',
		season: '4.6 (demo)',
		providerVersion: 'UPDATED 7.7',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'file_read', path: 'server skill.txt (not read in Phase 18D)' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'File names are ASR-garbled ("item pon bmd"); skill 55 is heard as "a 55". NOT STATED: whether the skill.txt value is per class column. Blind check: xue.22, xue.23.'
	}),
	C({
		claimId: 'CLAIM-115',
		statement: 'To sell the orb for coins instead of Zen, an ItemValue line keyed by 512 x category + item index (12/16 gives 6160) is added with the Zen price zeroed and the coin price set, followed by "Reload Shop".',
		sourceId: 'KI-044',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/XUeN6U74zME.pt.json segments 8:38-10:08`,
		entityTypes: ['SYSTEM', 'CONFIG', 'ITEM'],
		entities: ['CustomBuyVipAndCoin', 'ItemValue'],
		topic: 'systems',
		season: '4.6 (demo)',
		providerVersion: 'UPDATED 7.7',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'file_read', path: 'Data/Item/ItemValue.txt (not read in Phase 18D)' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO (MEDIUM -- degraded audio)',
		notes: 'The auto-caption renders the computed index as "61160", but the stated formula gives 6160 (512 x 12 + 16); the spoken figure is garbled -- do not copy it. The example price "100 Cash" is the presenter\'s, not a default, and which coin "Cash" means is not stated. Blind check: xue.25-28.'
	}),
	C({
		claimId: 'CLAIM-116',
		statement: 'The vendor states that server-side checks are authoritative for this system: a player who edits their own client item.bmd or skill.bmd cannot obtain the restricted skill, because only the administrator controls the server-side skill.txt.',
		sourceId: 'KI-044',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/XUeN6U74zME.pt.json segments 7:24-8:17`,
		entityTypes: ['SYSTEM', 'SECURITY'],
		entities: ['CustomBuyVipAndCoin'],
		topic: 'security',
		season: '4.6 (demo)',
		providerVersion: 'UPDATED 7.7',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [],
		confidence: 'CONFIRMED_VENDOR_VIDEO (LOW-MEDIUM -- the presenter\'s assertion in degraded audio; the enforcement mechanism is neither shown nor tested)',
		notes: 'The Phase 18C doc presented this as concrete anti-cheat evidence; it is the presenter\'s reasoning, never tested -- strength corrected in 18D. Blind check: xue.24.'
	}),
	C({
		claimId: 'CLAIM-117',
		statement: 'A change to a CustomBuyVipAndCoin (Data/Custom) entry is applied with "Reload Custom" followed by "Reload Shop", demonstrated without any server restart being shown or stated as required.',
		sourceId: 'KI-044',
		sourceAuthority: 'PROVIDER_TUTORIAL',
		sourceLocation: `${YT}/XUeN6U74zME.pt.json segments 5:44-5:53 (Reload Custom, Reload Shop), 9:54-10:02`,
		entityTypes: ['SYSTEM', 'OPERATIONS'],
		entities: ['CustomBuyVipAndCoin', 'GameServer'],
		topic: 'operations',
		season: '4.6 (demo)',
		providerVersion: 'UPDATED 7.7',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'Reload Custom + Reload Shop on a non-production GameServer -- none exists' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO',
		notes: 'Vendor-demonstrated on a 4.6 build, NOT tested on Blood Moon\'s instance. Scope: this Data/Custom + shop family only (see CLAIM-120). Blind check: xue.17, xue.27.'
	}),
	C({
		claimId: 'CLAIM-118',
		statement: 'Blood Moon\'s preserved CustomBuyVipAndCoin.txt is inert: every data row in both sections is commented out, leaving only the vendor\'s template examples (a Golden Box, two Silver Box rows, and the class-1 "Orb of Fire Slash" 12/16 row), and the file is byte-identical to a lab MuServer-stage copy file-dated 2023-10-05.',
		sourceId: REAL,
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: `RemoteData/Phase11/CustomBuyVipAndCoin.txt (sha256 ${CBVC_SHA}); byte-identical (cmp) to MU-Server/Lab/drop-validation/MuServer-stage/Data/Custom/CustomBuyVipAndCoin.txt`,
		entityTypes: ['SYSTEM', 'CONFIG'],
		entities: ['CustomBuyVipAndCoin', 'Data/Custom/'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'Data/Custom/CustomBuyVipAndCoin.txt' }],
		confidence: 'CONFIRMED_RUNTIME (preserved Phase 11 download, 2026-08-29; not re-read live in Phase 18D)',
		notes: 'An unmodified vendor default. Already recorded as "100% commented out" in docs/vip/vip-deep-audit.md and used as the disabled-row example in ADR-0024. Neither legacy purchase path is therefore live on Blood Moon: DmN never took a real payment, and this file and the /buyvip command are both disabled.'
	}),
	C({
		claimId: 'CLAIM-119',
		statement: 'The exact SQL table and column the closed-source engine writes when a /buyvip or CustomBuyVipAndCoin purchase executes is INFERRED, not confirmed: no engine source exists on the production VPS, and Blood Moon\'s own docs treat /buyvip as a suspected but unconfirmed caller of the native WZ_SetAccountLevel procedure while game-currency balances are presumed to live in CashShopData.',
		sourceId: 'synthesis-across-vps-source-hunt-and-docs-vip',
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: 'catalog/vps-inventory.json F2-P0-1 (source hunt, 0 source files); docs/vip/wz-setaccountlevel-coexistence.md (option C: the /buyvip caller is unconfirmed); context/ADR_INDEX.md row 0001 (preserved ADR-0001: WZ_SetAccountLevel/WZ_GetAccountLevel act on MEMB_INFO.AccountLevel/AccountExpireDate); docs/knowledge/LEGACY_SUPPLIER_INDEX.md (CashShopData trace)',
		entityTypes: ['SYSTEM', 'DATABASE'],
		entities: ['CustomBuyVip', 'CustomBuyVipAndCoin', 'CashShopData', 'WZ_SetAccountLevel', 'MEMB_INFO'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_LIKELY',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'schema_read', path: 'a live SQL trace or engine source -- neither is available or authorized' }],
		confidence: 'INFERENCE (PROBABLE) -- the message-819 balance triple matches CashShopData(WCoinC, WCoinP, GoblinPoint); nothing ties /buyvip to a specific procedure',
		notes: 'Explicit evidence boundary (Phase 18D Part 7): do not strengthen without engine source or an authorized SQL trace.'
	}),
	C({
		claimId: 'CLAIM-120',
		statement: 'The live-reload demonstrations for Buy Vip (CLAIM-110) and CustomBuyVipAndCoin (CLAIM-117) cover only those two config families and do not extend to CustomXShop.txt or CashShopProduct.txt (a separate family, documented in docs/economy/xshop-cashshop-config-field-matrix.md) whose RUNTIME_MUTABLE, RELOAD_REQUIRED and RESTART_REQUIRED status stays UNKNOWN for every field.',
		sourceId: 'synthesis-across-CLAIM-110-CLAIM-117-and-xshop-cashshop-config-field-matrix',
		sourceAuthority: 'REAL_BLOODMOON_CONFIG',
		sourceLocation: 'docs/economy/xshop-cashshop-config-field-matrix.md (all RELOAD/RESTART columns UNKNOWN); docs/decisions/0024-legacy-shop-control-plane.md',
		entityTypes: ['SYSTEM', 'CONFIG', 'OPERATIONS'],
		entities: ['CustomXShop', 'CashShopProduct', 'CustomBuyVip', 'CustomBuyVipAndCoin'],
		topic: 'operations',
		bloodMoonStatus: 'UNKNOWN',
		verificationStatus: 'UNVERIFIED',
		verificationTargets: [{ type: 'runtime_observation', path: 'reload/restart test of CustomXShop.txt/CashShopProduct.txt -- no non-production instance exists' }],
		confidence: 'CONFIRMED_VENDOR_VIDEO (for the boundary itself, i.e. that these are different files) / UNKNOWN (for the X-Shop/CashShop reload behavior)',
		notes: 'Explicit non-generalization (Phase 18D Part 7). Long-standing gap GAP-P18-07 / ADR-0024.'
	}),
	C({
		claimId: 'CLAIM-121',
		statement: 'On the code in this repository branch, crediting a paid recharge (RechargeIntent to a WC_PURCHASE_CREDIT ledger row via WalletLedgerService, currently through the Mercado Pago provider; the Asaas provider lives on other worktrees and was not audited) writes only the Portal\'s own ledger: the payments, wallet and commerce modules contain no reference to GameBridgeJob, CashShopData or MU_DATABASE_URL, so no automatic bridge from Portal WC into game currency exists in this code.',
		sourceId: 'code-read-2026-09-18',
		sourceAuthority: 'CURRENT_CODE',
		sourceLocation: 'apps/api/src/modules/payments, apps/api/src/modules/wallet, apps/api/src/modules/commerce (grep for GameBridgeJob|CashShopData|MU_DATABASE_URL returned no hits); WC_PURCHASE_CREDIT written at apps/api/src/modules/commerce/commerce.service.ts:1261',
		entityTypes: ['SYSTEM', 'CURRENCY'],
		entities: ['AccountCurrency', 'WalletLedgerService', 'CashShopData', 'RechargeIntent', 'Asaas'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'apps/api/src/modules/{payments,wallet,commerce}' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ (grep, this branch only)',
		notes: 'Scope caveat: this branch only ships the Mercado Pago provider; the Asaas provider (current direction, DEC-PAYMENTS-001) lives on other worktrees and was not re-audited. Its equivalence rests on the shared RechargeIntent/WalletLedgerService path plus the Phase 18C statement that the Asaas -> Portal WC -> game bridge is NOT IMPLEMENTED / NOT ENABLED. Also documented in docs/handoff/mercadopago-recharge-payments.md and docs/knowledge/CASH_VIP_INTEGRATION_MAP.md Part 4. Game currency delivery remains UNDECIDED (options A-D).'
	}),
	C({
		claimId: 'CLAIM-122',
		statement: 'Blood Moon\'s VIP architecture makes the Portal the VIP source of truth (ADR-0001) and delivers grants to the game through GRANT_VIP game-bridge commands (code present in apps/api/src/modules/vip), rather than through the native /buyvip command; the end-to-end enablement of that delivery path was not verified here.',
		sourceId: 'internal-doc-cross-reference',
		sourceAuthority: 'INTERNAL_DECISION',
		sourceLocation: 'context/ADR_INDEX.md row 0001 (preserved-only, HISTORICAL_SOURCE); docs/vip/vip-deep-audit.md ("Phase 13 architectural decision"); apps/api/src/modules/vip/game-bridge-vip.gateway.ts',
		entityTypes: ['SYSTEM', 'DECISION'],
		entities: ['CustomBuyVip', 'GRANT_VIP', 'VipService'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'NOT_APPLICABLE',
		verificationTargets: [],
		confidence: 'CONFIRMED_OPERATOR (recorded decision; deployment status not checked)',
		notes: 'Cross-reference so that a search for Buy Vip also surfaces Blood Moon\'s own direction, not only vendor behavior. NOT_APPLICABLE verification: a decision record, not a behavior claim (same treatment as CLAIM-014).'
	}),
	C({
		claimId: 'CLAIM-123',
		statement: 'In the preserved legacy Free MU CMS (DmN) PHP source, a confirmed web donation credits game currency through reward_user() then add_credits() then increase_credits(), a config-driven UPDATE of <table>.<column> = <column> + :credits whose target comes from admin config keys (credits_<server>|table_<type>, |credits_column_<type>, |account_column_<type>); the documented target for the game currencies is CashShopData (WCoinC, WCoinP, GoblinPoint).',
		sourceId: 'code-read-legacy-dmn-php',
		sourceAuthority: 'LEGACY_SUPPLIER_SOURCE',
		sourceLocation: 'Deploy/Cpanel-Backups/hostbr-web-20260716/extracted/backup-7.16.2026_12-53-47_mubloodxz/homedir/public_html/application/models/model.donate.php (reward_user; sha256 aac118e8cfe8c76d607b7fa23b483a4af6ffd9cbb948eea079384d1a98537662) and application/helpers/helper.website.php (add_credits, increase_credits; sha256 b3fe8a30192bd55dcd502a47a8ab81c25ebe36cece79fe8355877cc2b063ebc5); target table documented in mu-bloodmoon-legacy-catalog/docs/game-data/legacy-web-intelligence/currencies.md and docs/economy/legacy-dmn-cms-and-currency-investigation.md',
		entityTypes: ['SYSTEM', 'CURRENCY', 'DATABASE'],
		entities: ['DmN CMS', 'CashShopData', 'WCoinC', 'WCoinP', 'GoblinPoint', 'reward_user', 'add_credits'],
		topic: 'systems',
		bloodMoonStatus: 'LEGACY',
		verificationStatus: 'CONFIRMED_BY_CONFIG',
		verificationTargets: [{ type: 'file_read', path: 'the two preserved PHP files above (read in full in Phase 18)' }],
		confidence: 'CONFIRMED_STATIC_CODE_READ (preserved legacy source; the code path is read, the exact type-to-column config values were not -- GAP-P18-03)',
		notes: 'This is the real-money ENTRY side of the Cash flow; /buyvip and CustomBuyVipAndCoin (CLAIM-100..118) are the in-game SPEND side and must never be conflated with it. The checkout controllers/gateways that call reward_user() are in controller.donate.php / controller.payment.php. Full trace: docs/knowledge/LEGACY_SUPPLIER_INDEX.md. Legacy = not deployed; the Nuxt portal replaced this site at the documented cutover.'
	}),
	C({
		claimId: 'CLAIM-124',
		statement: 'The legacy DmN web commerce layer was never used for a real payment: at the 2026-08-30 SQL investigation DmN_Vip_Packages, DmN_Vip_Users, DmN_Donate, DmN_Donate_Transactions, DmN_Donate_Orders, DmN_2CheckOut_Transactions and DmN_PagSeguro_Transactions all held 0 rows, and the only non-zero CashShopData balances belonged to the four known test accounts.',
		sourceId: 'internal-doc-cross-reference',
		sourceAuthority: 'REAL_BLOODMOON_SQL',
		sourceLocation: 'docs/economy/legacy-dmn-cms-and-currency-investigation.md (read-only bm-sql queries, 2026-08-30); docs/accounts/pre-beta-account-review.md (the four test accounts)',
		entityTypes: ['SYSTEM', 'DATABASE'],
		entities: ['DmN CMS', 'CashShopData', 'DmN_Donate_Transactions'],
		topic: 'systems',
		bloodMoonStatus: 'BLOODMOON_CONFIRMED',
		verificationStatus: 'CONFIRMED_BY_RUNTIME',
		verificationTargets: [{ type: 'schema_read', path: 'row counts of the DmN_* commerce tables (re-check before any decommission -- see LEGACY_SUPPLIER_INDEX.md prerequisites)' }],
		confidence: 'CONFIRMED_RUNTIME (SQL read on 2026-08-30; not re-run in Phase 18D)',
		notes: 'Point-in-time: row counts must be re-checked immediately before any decommission decision. Schema classified LEGACY_DORMANT_SCHEMA and, per Bryan\'s direction of 2026-09-18, KEEP_DORMANT (not deleted, dependency audit incomplete).'
	})
]

// --------------------------------------------------------------- apply: index
let addedKi = 0
const appendedKi = []
const kiIds = new Set(index.entries.map((e) => e.id))
for (const k of newKi) {
	if (kiIds.has(k.id)) { console.log(`SKIP index ${k.id}`); continue }
	const entry = { ...kiCommon, ...k, derivedArtifacts: [] }
	index.entries.push(entry)
	appendedKi.push(entry)
	addedKi++
}

// -------------------------------------------------------------- apply: claims
let addedClaims = 0
const claimIds = new Set(claimsDoc.claims.map((c) => c.claimId))
for (const c of newClaims) {
	if (claimIds.has(c.claimId)) { console.log(`SKIP claim ${c.claimId}`); continue }
	claimsDoc.claims.push(c)
	addedClaims++
}

// -------------------------------------------------------------- apply: graph
const nodeIds = new Set(graph.nodes.map((n) => n.id))
const edgeKey = (e) => `${e.from}|${e.type}|${e.to}`
const edgeKeys = new Set(graph.edges.map(edgeKey))
let addedNodes = 0
let addedEdges = 0
const addNode = (n) => { if (!nodeIds.has(n.id)) { graph.nodes.push(n); nodeIds.add(n.id); addedNodes++ } }
const addEdge = (e) => { if (!edgeKeys.has(edgeKey(e))) { graph.edges.push(e); edgeKeys.add(edgeKey(e)); addedEdges++ } }

addNode({ id: 'SYS-buy-vip-command', type: 'SYSTEM', name: 'CustomBuyVip (native /buyvip command)', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'config block present but DISABLED and unconfigured on Blood Moon (CLAIM-101)' })
addNode({ id: 'SYS-custom-buy-vip-and-coin', type: 'SYSTEM', name: 'CustomBuyVipAndCoin', bloodMoonStatus: 'BLOODMOON_CONFIRMED', note: 'file present but every row commented out on Blood Moon (CLAIM-118)' })
addNode({ id: 'CFG-gameserverinfo-command-dat', type: 'CONFIG', name: 'GameServer/DATA/GameServerInfo - Command.dat', bloodMoonStatus: 'BLOODMOON_CONFIRMED' })
addNode({ id: 'CFG-custombuyvipandcoin-txt', type: 'CONFIG', name: 'Data/Custom/CustomBuyVipAndCoin.txt', bloodMoonStatus: 'BLOODMOON_CONFIRMED' })
for (const k of newKi) addNode({ id: `SRC-${k.id}`, type: 'SOURCE', name: `${k.id} (${k.videoId})` })
addNode({ id: 'SRC-real-config-buyvip', type: 'SOURCE', name: 'real Command.dat + CustomBuyVipAndCoin.txt + Message.txt (preserved Phase 6/10/11 downloads, read 2026-09-18)', sourceAuthority: 'REAL_BLOODMOON_CONFIG' })

addEdge({ from: 'SYS-buy-vip-command', type: 'CONFIGURED_BY', to: 'CFG-gameserverinfo-command-dat' })
addEdge({ from: 'SYS-custom-buy-vip-and-coin', type: 'CONFIGURED_BY', to: 'CFG-custombuyvipandcoin-txt' })
addEdge({ from: 'SYS-buy-vip-command', type: 'RELATED_TO', to: 'SYS-custom-buy-vip-and-coin' })

// KI -> claim edges are derived from the KI-NNN tokens in each claim's sourceId,
// so a claim with two supporting videos gets two SUPPORTS_CLAIM edges (dedup by
// one canonical claim, Part 10).
for (const c of newClaims) {
	for (const m of (c.sourceId || '').matchAll(/KI-\d+/g)) addEdge({ from: `SRC-${m[0]}`, type: 'SUPPORTS_CLAIM', to: c.claimId })
	if ((c.sourceId || '').startsWith(REAL)) addEdge({ from: 'SRC-real-config-buyvip', type: 'SUPPORTS_CLAIM', to: c.claimId })
}
addEdge({ from: 'CLAIM-107', type: 'RELATED_TO', to: 'CLAIM-091' })
addEdge({ from: 'CLAIM-104', type: 'RELATED_TO', to: 'CLAIM-098' })
addEdge({ from: 'CLAIM-104', type: 'RELATED_TO', to: 'CLAIM-123' })
addEdge({ from: 'CLAIM-123', type: 'RELATED_TO', to: 'CLAIM-124' })

// ---------------------------------------------------- apply: verification queue
const qIds = new Set(queue.items.map((i) => i.claimId))
const doneItems = [
	['CLAIM-100', 'HIGH', 'file_read', 'GameServerInfo - Command.dat "Command Buy Vip Settings" block + Message.txt ids 815-820', `CONFIRMED_BY_CONFIG -- block present with 3 VIP slots x 3 price values; block byte-identical in the Phase 6 and Phase 11 downloads.`, [`RemoteData/Phase11/GameServerInfo - Command.dat`, `sha256:${CMD_SHA}`, `RemoteData/Phase10/Message.txt`, `sha256:${MSG_SHA}`]],
	['CLAIM-101', 'HIGH', 'file_read', 'CommandBuyVipSwitch / Enable_AL / PriceValue / CheckUserSwitch values', 'CONFIRMED_BY_CONFIG -- Switch=0, all Enable=0, all 9 prices=0, CheckUserSwitch=0, MinDays=15, MaxDays=30. The command is disabled and unconfigured on Blood Moon (as of the 2026-08-29 snapshot).', [`RemoteData/Phase11/GameServerInfo - Command.readable.txt`, `sha256:${CMD_SHA}`]],
	['CLAIM-103', 'MEDIUM', 'file_read', 'Message.txt id 819 (insufficient-balance message) and the three price fields', 'CONFIRMED_BY_CONFIG -- message 819 lists WCoinC/WCoinP/GoblinPoint balances against the VIP price in the same three currencies.', [`RemoteData/Phase10/Message.txt`, `sha256:${MSG_SHA}`]],
	['CLAIM-104', 'MEDIUM', 'file_read', 'structure of the Buy Vip block (no gateway/URL field)', 'CONFIRMED_BY_CONFIG (structure). The "not a real-money path" conclusion is structural; the engine is closed-source.', [`RemoteData/Phase11/GameServerInfo - Command.dat`, `sha256:${CMD_SHA}`]],
	['CLAIM-111', 'MEDIUM', 'file_read', 'CustomBuyVipAndCoin.txt column headers', 'CONFIRMED_BY_CONFIG -- section 0 and section 1 headers read directly.', [`RemoteData/Phase11/CustomBuyVipAndCoin.txt`, `sha256:${CBVC_SHA}`]],
	['CLAIM-118', 'MEDIUM', 'file_read', 'whether any CustomBuyVipAndCoin.txt row is active on Blood Moon', 'CONFIRMED_BY_CONFIG -- every data row commented out; byte-identical to the lab-stage copy file-dated 2023-10-05.', [`RemoteData/Phase11/CustomBuyVipAndCoin.txt`, `sha256:${CBVC_SHA}`, `MU-Server/Lab/drop-validation/MuServer-stage/Data/Custom/CustomBuyVipAndCoin.txt`]],
	['CLAIM-123', 'HIGH', 'file_read', 'reward_user/add_credits/increase_credits in the preserved legacy PHP', 'CONFIRMED_BY_CONFIG (static code read of the preserved legacy source; the type-to-column config values were not read -- GAP-P18-03).', ['Deploy/Cpanel-Backups/hostbr-web-20260716/extracted/backup-7.16.2026_12-53-47_mubloodxz/homedir/public_html/application/models/model.donate.php', 'sha256:aac118e8cfe8c76d607b7fa23b483a4af6ffd9cbb948eea079384d1a98537662', 'application/helpers/helper.website.php', 'sha256:b3fe8a30192bd55dcd502a47a8ab81c25ebe36cece79fe8355877cc2b063ebc5']],
	['CLAIM-124', 'MEDIUM', 'schema_read', 'row counts of the DmN_* commerce tables', 'CONFIRMED_BY_RUNTIME -- 0 rows across the commerce tables at the 2026-08-30 SQL read; NOT re-run in Phase 18D, re-check before any decommission.', ['docs/economy/legacy-dmn-cms-and-currency-investigation.md']],
	['CLAIM-121', 'HIGH', 'file_read', 'recharge-credit path in payments/wallet/commerce modules', 'CONFIRMED_BY_CONFIG (static code read, this branch only) -- no GameBridgeJob/CashShopData/MU_DATABASE_URL reference; Asaas provider not on this branch.', ['apps/api/src/modules/payments', 'apps/api/src/modules/wallet', 'apps/api/src/modules/commerce/commerce.service.ts:1261']]
]
const blockedReason = 'BLOCKED -- no non-production GameServer instance exists and production observation is out of scope; vendor-demonstrated behavior only.'
const blockedItems = [
	['CLAIM-102', 'LOW', 'runtime_observation', 'in-game Buy Vip button and the GameServer build vs vendor update 8.3'],
	['CLAIM-105', 'MEDIUM', 'runtime_observation', 'per-day x days pricing arithmetic of /buyvip'],
	['CLAIM-106', 'MEDIUM', 'runtime_observation', 'already-VIP refusal behavior of CommandBuyVipCheckUserSwitch'],
	['CLAIM-110', 'MEDIUM', 'runtime_observation', 'Reload Comand applies Buy Vip settings without a restart'],
	['CLAIM-112', 'LOW', 'runtime_observation', 'section-0 coin/VIP grant behavior'],
	['CLAIM-113', 'LOW', 'runtime_observation', 'section-1 class-skill delivery behavior'],
	['CLAIM-114', 'LOW', 'file_read', 'server skill.txt enablement dependency (skill.txt not read)'],
	['CLAIM-115', 'LOW', 'file_read', 'ItemValue coin-price line and index formula (ItemValue.txt not read)'],
	['CLAIM-116', 'LOW', 'runtime_observation', 'server-authoritative rejection of client-edited item.bmd/skill.bmd'],
	['CLAIM-117', 'MEDIUM', 'runtime_observation', 'Reload Custom + Reload Shop applies CustomBuyVipAndCoin changes without a restart'],
	['CLAIM-119', 'MEDIUM', 'schema_read', 'exact SQL table/column written by /buyvip and CustomBuyVipAndCoin (no engine source, no authorized SQL trace)'],
	['CLAIM-120', 'MEDIUM', 'runtime_observation', 'reload/restart behavior of CustomXShop.txt and CashShopProduct.txt (GAP-P18-07)']
]
let addedQ = 0
for (const [claimId, priority, verificationType, target, result, evidenceRefs] of doneItems) {
	if (qIds.has(claimId)) continue
	queue.items.push({ claimId, priority, verificationType, target, safeMethod: 'local read of the already-preserved, hash-recorded download; no new RemoteOps call and no production access in Phase 18D', status: 'DONE', result, evidenceRefs })
	addedQ++
}
for (const [claimId, priority, verificationType, target] of blockedItems) {
	if (qIds.has(claimId)) continue
	queue.items.push({ claimId, priority, verificationType, target, safeMethod: 'none available without a non-production GameServer instance or engine source', status: 'BLOCKED', result: blockedReason, evidenceRefs: [] })
	addedQ++
}
const count = (s) => queue.items.filter((i) => i.status === s).length
queue.generatedAt = now
// Rebuild the Phase 18D sentence from final state instead of appending on every run
// (keeps the script idempotent for the note as well as the items).
const p18d = queue.items.filter((i) => Number(i.claimId.replace('CLAIM-', '')) >= 100)
const baseNote = queue.summary.note.split(' Phase 18D (2026-09-18)')[0]
queue.summary = {
	...queue.summary,
	total: queue.items.length,
	done: count('DONE'),
	queued: count('QUEUED'),
	blocked: count('BLOCKED'),
	inProgress: count('IN_PROGRESS'),
	note: `${baseNote} Phase 18D (2026-09-18) added ${p18d.length} items for CLAIM-100 and above (${p18d.filter((i) => i.status === 'DONE').length} DONE against Blood Moon's preserved real config, code and SQL evidence; ${p18d.filter((i) => i.status === 'BLOCKED').length} BLOCKED because no non-production GameServer instance exists).`
}

// ------------------------------------------------------------ apply: checkpoint
if (!checkpoint.phase18dCompleted) {
	checkpoint.phase18dCompleted = [
		'Phase 18D (2026-09-18): registered the 3 priority Buy-Vip videos (gqtSk1pdti4, Jia1TrtgZfY, XUeN6U74zME) as KI-042/043/044 with CLAIM-100..122; extraction was agent-authored (this sweep has never had an automated claim extractor) and cross-checked against a blind second extraction and Blood Moon\'s preserved real config.',
		'Counts changed: videos with a knowledge-index entry 39 -> 42; pure-RAW videos not yet normalized 69 -> 66 (27 P0 unchanged); the "69" in notStarted[0] and resumeInstructions[4] above is superseded by 66.',
		'Real-config finding: Blood Moon\'s /buyvip command block is present but DISABLED and unconfigured, and CustomBuyVipAndCoin.txt is entirely commented out (CLAIM-101, CLAIM-118).',
		'Re-run the three generators after any claim edit: knowledge-transcript-inventory.mjs, knowledge-canonical-facts.mjs --write, knowledge-provenance-report.mjs --write.'
	]
}
checkpoint.lastUpdatedUtc = now

// ------------------------------------------------------------------- write out
index.generatedAt = now
claimsDoc.generatedAt = now
graph.generatedAt = now
appendEntriesText('knowledge-index.json', appendedKi, now)
save('atomic-claims.json', claimsDoc)
save('knowledge-graph.json', graph)
save('verification-queue.json', queue)
save('checkpoint.json', checkpoint)

console.log(`Added: ${addedKi} index entries, ${addedClaims} claims, ${addedNodes} graph nodes, ${addedEdges} graph edges, ${addedQ} verification-queue items.`)
