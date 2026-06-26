export type EquipmentQualityKey =
  | 'normal'
  | 'excellent'
  | 'ancient'
  | 'socket'
  | 'masteryAncient'
  | 'lucky'

export type EquipmentOptionScope =
  | 'normal'
  | 'excellent'
  | 'ancient'
  | 'socket'
  | 'mastery'
  | 'lucky'
  | 'harmony'
  | 'guardian'

export type EquipmentOptionRule = {
  key: string
  label: string
  scope: EquipmentOptionScope
  appliesTo: 'all' | 'armor' | 'weapon' | 'shield' | 'socket'
  notes?: string
}

export const equipmentQualityLabels: Record<EquipmentQualityKey, string> = {
  normal: 'Normal',
  excellent: 'Excellent',
  ancient: 'Ancient',
  socket: 'Socket',
  masteryAncient: 'Mastery Ancient',
  lucky: 'Lucky Set'
}

export const baseLuckAndAdditionalOptions: EquipmentOptionRule[] = [
  {
    key: 'luck-soul',
    label: 'Luck: Jewel of Soul success rate +25%',
    scope: 'normal',
    appliesTo: 'all'
  },
  {
    key: 'luck-critical',
    label: 'Luck: Critical Damage Rate +5%',
    scope: 'normal',
    appliesTo: 'all'
  },
  {
    key: 'additional-defense',
    label: 'Additional defense +4 / +8 / +12 / +16',
    scope: 'normal',
    appliesTo: 'armor'
  },
  {
    key: 'additional-damage',
    label: 'Additional damage / wizardry damage +4 / +8 / +12 / +16',
    scope: 'normal',
    appliesTo: 'weapon'
  }
]

export const excellentDefenseOptions: EquipmentOptionRule[] = [
  { key: 'excellent-hp', label: 'HP +4%', scope: 'excellent', appliesTo: 'armor' },
  { key: 'excellent-mana', label: 'Mana +4%', scope: 'excellent', appliesTo: 'armor' },
  { key: 'excellent-def-rate', label: 'Defense success rate +10%', scope: 'excellent', appliesTo: 'armor' },
  { key: 'excellent-dd', label: 'Damage decrease +4%', scope: 'excellent', appliesTo: 'armor' },
  { key: 'excellent-reflect', label: 'Reflect damage +5%', scope: 'excellent', appliesTo: 'armor' },
  { key: 'excellent-zen', label: 'Zen drop amount +30%', scope: 'excellent', appliesTo: 'armor' }
]

export const ancientSetOptions: EquipmentOptionRule[] = [
  {
    key: 'ancient-set-effect',
    label: 'Set Item Equipment Information: bonuses activate by equipped ancient pieces.',
    scope: 'ancient',
    appliesTo: 'armor'
  },
  {
    key: 'ancient-luck-additional',
    label: 'Can also roll Luck and Additional option when the original item supports it.',
    scope: 'ancient',
    appliesTo: 'all'
  }
]

export const masteryAncientOptions: EquipmentOptionRule[] = [
  {
    key: 'mastery-ancient-set-effect',
    label: 'Mastery/Angel era set effect: new-generation set bonuses by equipped pieces.',
    scope: 'mastery',
    appliesTo: 'armor',
    notes: 'Includes Bloodangel, Darkangel, Holyangel, Soul, Blue Eye, Manticore, Silver Heart and later families.'
  },
  {
    key: 'mastery-additional-lines',
    label: 'Uses modern additional lines that must be validated per version before publishing.',
    scope: 'mastery',
    appliesTo: 'all'
  }
]

export const socketSeedSphereOptions: EquipmentOptionRule[] = [
  {
    key: 'socket-fire-lightning-ice',
    label: 'Weapon sockets: Fire, Lightning and Ice Seed Sphere options.',
    scope: 'socket',
    appliesTo: 'socket'
  },
  {
    key: 'socket-water-wind-earth',
    label: 'Armor/shield sockets: Water, Wind and Earth Seed Sphere options.',
    scope: 'socket',
    appliesTo: 'socket'
  },
  {
    key: 'socket-bonus',
    label: 'Socket bonus option may activate from valid Seed Sphere combinations.',
    scope: 'socket',
    appliesTo: 'socket'
  }
]

export const luckySetOptions: EquipmentOptionRule[] = [
  {
    key: 'lucky-fixed-pattern',
    label: 'Lucky Set uses its fixed set pattern and should only be blessed/refined in our preview.',
    scope: 'lucky',
    appliesTo: 'armor'
  }
]

export const harmonyAndGuardianOptions: EquipmentOptionRule[] = [
  {
    key: 'harmony-yellow-option',
    label: 'Jewel of Harmony: adds one yellow option, upgraded with Lower/Higher Refining Stone when the server version allows it.',
    scope: 'harmony',
    appliesTo: 'all'
  },
  {
    key: 'guardian-380-option',
    label: 'Jewel of Guardian: adds the 380/Siege option to eligible level 380 items through Chaos Machine rules.',
    scope: 'guardian',
    appliesTo: 'all'
  }
]
