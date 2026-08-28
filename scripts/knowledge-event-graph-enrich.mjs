#!/usr/bin/env node
// Knowledge Phase 8 -- links knowledge/vendor-sweep/beta-readiness/event-registry.json
// (the curated per-event fact registry) into knowledge-graph.json. Idempotent:
// safe to re-run any time the registry grows -- only adds nodes/edges that
// don't already exist, and reuses the 8 EVENT nodes an earlier phase already
// created under different ids/display names (see CANONICAL_NAME_TO_EXISTING_NODE_ID)
// rather than creating duplicates.
//
// Usage: node scripts/knowledge-event-graph-enrich.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const GRAPH_PATH = 'knowledge/vendor-sweep/knowledge-graph.json'
const REGISTRY_PATH = 'knowledge/vendor-sweep/beta-readiness/event-registry.json'

const graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf8'))
const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))

const nodeIds = new Set(graph.nodes.map((n) => n.id))
const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))

// The graph already has EVENT nodes for 8 of this registry's events, added
// in an earlier phase under display names/ids that don't string-match this
// registry's canonicalName (e.g. graph name "Custom Zombie Event" / id
// "EVT-custom-zombie" vs registry canonicalName "CustomEventZombie"). This
// explicit map is the authoritative link -- checked by hand against the
// actual graph contents, not string-matched, so it can't silently create a
// duplicate node the way a fuzzy name match could.
const CANONICAL_NAME_TO_EXISTING_NODE_ID = {
  CustomEventZombie: 'EVT-custom-zombie',
  CustomEventPandora: 'EVT-custom-pandora',
  CustomEventStopOrDie: 'EVT-custom-stop-or-die',
  BloodCastle: 'EVT-blood-castle',
  ChaosCastle: 'EVT-chaos-castle',
  DevilSquare: 'EVENT-devil-square',
  IllusionTemple: 'EVT-illusion-temple',
  PvPAll: 'EVENT-pvp-all'
}

function slug(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function bloodMoonStatusFor(e) {
  if (e.verificationStatus === 'CONFIRMED_BY_CONFIG') return 'BLOODMOON_CONFIRMED'
  if (e.verificationStatus === 'CONTRADICTED_BY_CONFIG') return 'BLOODMOON_CONTRADICTED'
  if (e.verificationStatus === 'CONFIRMED_VENDOR_VIDEO') return 'BLOODMOON_LIKELY'
  return 'UNVERIFIED'
}

let nodesAdded = 0
let edgesAdded = 0
const addedLog = []

function ensureMapNode(mapId) {
  const id = `MAP-${mapId}`
  if (!nodeIds.has(id)) {
    graph.nodes.push({ id, type: 'MAP', name: `Map ${mapId} (numeric ID only, no confirmed name)` })
    nodeIds.add(id)
    nodesAdded++
    addedLog.push(`node ${id}`)
  }
  return id
}

function extractNpcClass(npcText) {
  if (!npcText) return null
  const m = /class\s+(\d+)/i.exec(npcText)
  return m ? m[1] : null
}

function ensureNpcNode(npcText, eventName) {
  const cls = extractNpcClass(npcText)
  if (!cls) return null
  const id = `NPC-${cls}`
  if (!nodeIds.has(id)) {
    graph.nodes.push({ id, type: 'NPC', name: `${eventName} entry NPC (class ${cls})` })
    nodeIds.add(id)
    nodesAdded++
    addedLog.push(`node ${id}`)
  }
  return id
}

function addEdge(from, type, to, claimRefs, status) {
  const exists = graph.edges.some((e) => e.from === from && e.type === type && e.to === to)
  if (exists) return
  const edge = { from, type, to }
  if (claimRefs && claimRefs.length) edge.claimRefs = claimRefs
  if (status) edge.status = status
  graph.edges.push(edge)
  edgesAdded++
  addedLog.push(`edge ${from} -${type}-> ${to}`)
}

for (const e of registry.events) {
  const status = bloodMoonStatusFor(e)
  let node = null

  const existingId = CANONICAL_NAME_TO_EXISTING_NODE_ID[e.canonicalName]
  if (existingId) {
    node = nodeById.get(existingId)
    if (!node) throw new Error(`Expected existing node ${existingId} for ${e.canonicalName} not found -- graph may have changed`)
  } else {
    const id = `EVT-${slug(e.canonicalName)}`
    if (nodeIds.has(id)) {
      node = nodeById.get(id)
    } else {
      node = { id, type: 'EVENT', name: e.canonicalName, bloodMoonStatus: status }
      graph.nodes.push(node)
      nodeIds.add(id)
      nodeById.set(id, node)
      nodesAdded++
      addedLog.push(`node ${id} (${e.canonicalName})`)
    }
  }

  const isKnown = (v) => v !== undefined && v !== null && v !== 'UNKNOWN' && !String(v).startsWith('UNKNOWN')

  // OCCURS_IN_MAP -- only for a single confirmed numeric mapId (skip
  // compound/ambiguous values like "0 (entry NPC) / 1 (event area)" or
  // "up to ~30 independently configured instances across different maps",
  // which aren't a single map id).
  if (isKnown(e.mapId) && /^\d+$/.test(e.mapId.trim())) {
    const mapNodeId = ensureMapNode(e.mapId.trim())
    addEdge(node.id, 'OCCURS_IN_MAP', mapNodeId, e.claimRefs, status)
  }

  // HAS_ENTRY_NPC -- only where a specific NPC class number is stated.
  if (isKnown(e.npc)) {
    const npcNodeId = ensureNpcNode(e.npc, e.canonicalName)
    if (npcNodeId) addEdge(node.id, 'HAS_ENTRY_NPC', npcNodeId, e.claimRefs, status)
  }

  // PART_OF the /participar (JoinEvent) command family, for events confirmed
  // on the real 10-event allowlist.
  if (e.entryMethod === 'PARTICIPAR') {
    addEdge(node.id, 'PART_OF', 'SYS-join-event', e.claimRefs, status)
  }
}

// The one specific, evidence-backed conflict/alias relationship this phase
// surfaced: CustomArena's "Mata-Mata" preset and PvPAll share a Portuguese
// name but are architecturally unrelated systems (CLAIM-155).
const arenaId = `EVT-${slug('CustomArena')}`
const pvpAllId = CANONICAL_NAME_TO_EXISTING_NODE_ID.PvPAll
if (nodeIds.has(arenaId) && nodeIds.has(pvpAllId)) {
  addEdge(arenaId, 'RELATED_TO', pvpAllId, ['CLAIM-155'], 'PROVIDER_SPECIFIC')
}

writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2) + '\n')
console.log(`nodes added: ${nodesAdded}, edges added: ${edgesAdded}`)
console.log(addedLog.join('\n'))
