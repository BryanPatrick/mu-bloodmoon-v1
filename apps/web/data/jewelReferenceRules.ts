export type JewelRule = {
  key: string
  name: string
  family: 'upgrade' | 'additional' | 'harmony' | 'guardian' | 'socket'
  appliesTo: string[]
  visualLine: string
  sourceUrls: string[]
  notes: string
}

export const jewelReferenceRules: JewelRule[] = [
  {
    key: 'jewel-of-bless',
    name: 'Jewel of Bless',
    family: 'upgrade',
    appliesTo: ['Item level +1 to +6', 'Guardian item repair in modern systems'],
    visualLine: 'Upgrade/bless changes item level and can create stronger glow at higher levels.',
    sourceUrls: ['https://muonlinefanz.com/tools/items/data/itemdb/Jewel%20of%20Bless.php'],
    notes: 'Used as base upgrade jewel. Preview must not treat upgrade glow as part of the original item model.'
  },
  {
    key: 'jewel-of-soul',
    name: 'Jewel of Soul',
    family: 'upgrade',
    appliesTo: ['Item level +7 to +9 and higher depending server rules'],
    visualLine: 'Soul upgrade affects item level and can intensify glow.',
    sourceUrls: ['https://muonlinefanz.com/tools/items/data/itemdb/Jewel%20of%20Soul.php'],
    notes: 'Soul success varies by luck/server. Keep rates configurable.'
  },
  {
    key: 'jewel-of-life',
    name: 'Jewel of Life',
    family: 'additional',
    appliesTo: ['Additional defense', 'Additional damage', 'Additional wizardry damage'],
    visualLine: 'Blue additional option line or equivalent server tooltip line.',
    sourceUrls: ['https://muonlinefanz.com/tools/items/data/itemdb/Jewel%20of%20Life.php'],
    notes: 'Used for additional option, not Excellent option.'
  },
  {
    key: 'jewel-of-harmony',
    name: 'Jewel of Harmony',
    family: 'harmony',
    appliesTo: ['Weapons', 'Armor sets', 'Shields'],
    visualLine: 'Yellow Harmony option line.',
    sourceUrls: [
      'https://muonlinefanz.com/tools/items/data/itemdb/Jewel%20of%20Harmony.php',
      'https://www.guiamuonline.com/jewel-of-harmony',
      'https://www.guiamuonline.com/todo-sobre-las-opciones-jewel-of-harmony'
    ],
    notes: 'Season/version rules vary. Classic guides usually show one random Harmony option per item; newer references mention multi-option systems. Validate by server season before publishing.'
  },
  {
    key: 'jewel-of-guardian',
    name: 'Jewel of Guardian',
    family: 'guardian',
    appliesTo: ['Siege/380 items', 'Eligible high-tier equipment'],
    visualLine: 'Guardian/Siege option line, commonly pink or purple depending client.',
    sourceUrls: [
      'https://muonlinefanz.com/tools/items/data/itemdb/Jewel%20of%20Guardian.php',
      'https://muonlinefanz.com/guide/items/siege/'
    ],
    notes: 'Obtained from Land of Trials in common references. Use only on eligible 380/Siege items.'
  },
  {
    key: 'seed-sphere',
    name: 'Seed Sphere',
    family: 'socket',
    appliesTo: ['Socket weapons', 'Socket armor', 'Socket shields'],
    visualLine: 'Socket option lines under Socket item option info.',
    sourceUrls: ['https://muonlinefanz.com/guide/items/socket/'],
    notes: 'Socket items can still have normal Luck/Additional lines, plus socket slots with Seed Sphere options.'
  }
]
