// PHASE S (2026-09-02) -- generated snapshot of Bryan's Phase R
// classification, one entry per real X-Shop/CashShop catalog row (168 +
// 12 = 180 total). Generated from docs/economy/xshop-full-inventory.csv
// and docs/economy/cashshop-bryan-decision-table.md -- see
// legacy-catalog-config.service.ts#seedFromXshopDecisionData for how
// this is consumed. A future re-review must regenerate this file
// alongside the ADR update, same discipline as legacy-catalog-policy.ts.

export type XshopSeedEntry = { legacyKey: string, itemName: string, technicalIdentifiers: Record<string, unknown> }

export const XSHOP_SEED_ENTRIES: readonly XshopSeedEntry[] = [
  {
    "legacyKey": "0-0",
    "itemName": "Kris",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 0,
      "category": "Swords",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-1",
    "itemName": "Short Sword",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 1,
      "category": "Swords",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-2",
    "itemName": "Rapier",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 2,
      "category": "Swords",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-3",
    "itemName": "Katana",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 3,
      "category": "Swords",
      "coin0": 500,
      "coin1": 200,
      "coin2": 60,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-4",
    "itemName": "Sword of Assassin",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 4,
      "category": "Swords",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-5",
    "itemName": "Blade",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 5,
      "category": "Swords",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-6",
    "itemName": "Gladius",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 6,
      "category": "Swords",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-7",
    "itemName": "Falchion",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 7,
      "category": "Swords",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-8",
    "itemName": "Serpent Sword",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 8,
      "category": "Swords",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-9",
    "itemName": "Sword of Salamander",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 9,
      "category": "Swords",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-10",
    "itemName": "Light Saber",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 10,
      "category": "Swords",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "0-11",
    "itemName": "Legendary Sword",
    "technicalIdentifiers": {
      "itemType": 0,
      "itemIndex": 11,
      "category": "Swords",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "60",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-0",
    "itemName": "Small Axe",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 0,
      "category": "Axes",
      "coin0": 10000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-1",
    "itemName": "Hand Axe",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 1,
      "category": "Axes",
      "coin0": 20000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-2",
    "itemName": "Double Axe",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 2,
      "category": "Axes",
      "coin0": 30000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-3",
    "itemName": "Tomahawk",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 3,
      "category": "Axes",
      "coin0": 15000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-4",
    "itemName": "Elven Axe",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 4,
      "category": "Axes",
      "coin0": 25000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-5",
    "itemName": "Battle Axe",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 5,
      "category": "Axes",
      "coin0": 25000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-6",
    "itemName": "Nikea Axe",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 6,
      "category": "Axes",
      "coin0": 25000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-7",
    "itemName": "Larkan Axe",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 7,
      "category": "Axes",
      "coin0": 25000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-8",
    "itemName": "Crescent Axe",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 8,
      "category": "Axes",
      "coin0": 25000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-9",
    "itemName": "NOT_AVAILABLE",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 9,
      "category": "Axes",
      "coin0": 25000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-10",
    "itemName": "NOT_AVAILABLE",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 10,
      "category": "Axes",
      "coin0": 25000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "1-11",
    "itemName": "NOT_AVAILABLE",
    "technicalIdentifiers": {
      "itemType": 1,
      "itemIndex": 11,
      "category": "Axes",
      "coin0": 25000,
      "coin1": 50,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-0",
    "itemName": "Mace",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 0,
      "category": "Scepters",
      "coin0": 10000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-1",
    "itemName": "Morning Star",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 1,
      "category": "Scepters",
      "coin0": 20000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-2",
    "itemName": "Flail",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 2,
      "category": "Scepters",
      "coin0": 30000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-3",
    "itemName": "Great Hammer",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 3,
      "category": "Scepters",
      "coin0": 15000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-4",
    "itemName": "Crystal Morning Star",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 4,
      "category": "Scepters",
      "coin0": 25000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-5",
    "itemName": "Crystal Sword",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 5,
      "category": "Scepters",
      "coin0": 25000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-6",
    "itemName": "Chaos Dragon Axe",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 6,
      "category": "Scepters",
      "coin0": 25000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-7",
    "itemName": "Elemental Mace",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 7,
      "category": "Scepters",
      "coin0": 25000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-8",
    "itemName": "Battle Scepter",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 8,
      "category": "Scepters",
      "coin0": 25000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-9",
    "itemName": "Master Scepter",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 9,
      "category": "Scepters",
      "coin0": 25000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-10",
    "itemName": "Great Scepter",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 10,
      "category": "Scepters",
      "coin0": 25000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "2-11",
    "itemName": "Lord Scepter",
    "technicalIdentifiers": {
      "itemType": 2,
      "itemIndex": 11,
      "category": "Scepters",
      "coin0": 25000,
      "coin1": 30,
      "coin2": 10,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-0",
    "itemName": "Light Spear",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 0,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-1",
    "itemName": "Spear",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 1,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-2",
    "itemName": "Dragon Lance",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 2,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-3",
    "itemName": "Giant Trident",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 3,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-4",
    "itemName": "Serpent Spear",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 4,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-5",
    "itemName": "Double Poleaxe",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 5,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-6",
    "itemName": "Halberd",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 6,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-7",
    "itemName": "Berdysh",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 7,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-8",
    "itemName": "Great Scythe",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 8,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-9",
    "itemName": "Bill of Balrog",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 9,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-10",
    "itemName": "Dragon Spear",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 10,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "3-11",
    "itemName": "Brova",
    "technicalIdentifiers": {
      "itemType": 3,
      "itemIndex": 11,
      "category": "Spears",
      "coin0": 0,
      "coin1": 100,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-0",
    "itemName": "Short Bow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 0,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-1",
    "itemName": "Bow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 1,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-2",
    "itemName": "Elven Bow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 2,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-3",
    "itemName": "Battle Bow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 3,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-4",
    "itemName": "Tiger Bow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 4,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-5",
    "itemName": "Silver Bow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 5,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-6",
    "itemName": "Chaos Nature Bow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 6,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-7",
    "itemName": "Bolt",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 7,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-8",
    "itemName": "Crossbow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 8,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-9",
    "itemName": "Golden Crossbow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 9,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-10",
    "itemName": "Arquebus",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 10,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "4-11",
    "itemName": "Light Crossbow",
    "technicalIdentifiers": {
      "itemType": 4,
      "itemIndex": 11,
      "category": "Bows/CrosBows",
      "coin0": 0,
      "coin1": 0,
      "coin2": 200,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-0",
    "itemName": "Skull Staff",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 0,
      "category": "Staffs",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-1",
    "itemName": "Angelic Staff",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 1,
      "category": "Staffs",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-2",
    "itemName": "Serpent Staff",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 2,
      "category": "Staffs",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-3",
    "itemName": "Thunder Staff",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 3,
      "category": "Staffs",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-4",
    "itemName": "Gorgon Staff",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 4,
      "category": "Staffs",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-5",
    "itemName": "Legendary Staff",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 5,
      "category": "Staffs",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-6",
    "itemName": "Staff of Resurrection",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 6,
      "category": "Staffs",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-7",
    "itemName": "Chaos Lighting Staff",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 7,
      "category": "Staffs",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-8",
    "itemName": "Staff of Destruction",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 8,
      "category": "Staffs",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-9",
    "itemName": "Dragon Soul Staff",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 9,
      "category": "Staffs",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-10",
    "itemName": "Divine Staff of Archangel",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 10,
      "category": "Staffs",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "5-11",
    "itemName": "Staff of Kundun",
    "technicalIdentifiers": {
      "itemType": 5,
      "itemIndex": 11,
      "category": "Staffs",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-0",
    "itemName": "Small Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 0,
      "category": "Shields",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-1",
    "itemName": "Horn Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 1,
      "category": "Shields",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-2",
    "itemName": "Kite Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 2,
      "category": "Shields",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-3",
    "itemName": "Elven Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 3,
      "category": "Shields",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-4",
    "itemName": "Buckler",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 4,
      "category": "Shields",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-5",
    "itemName": "Dragon Slayer Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 5,
      "category": "Shields",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-6",
    "itemName": "Skull Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 6,
      "category": "Shields",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-7",
    "itemName": "Spiked Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 7,
      "category": "Shields",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-8",
    "itemName": "Tower Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 8,
      "category": "Shields",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-9",
    "itemName": "Plate Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 9,
      "category": "Shields",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-10",
    "itemName": "Large Round Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 10,
      "category": "Shields",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "6-11",
    "itemName": "Serpent Shield",
    "technicalIdentifiers": {
      "itemType": 6,
      "itemIndex": 11,
      "category": "Shields",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-0",
    "itemName": "Bronze Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 0,
      "category": "Helms",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-1",
    "itemName": "Dragon Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 1,
      "category": "Helms",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-2",
    "itemName": "Pad Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 2,
      "category": "Helms",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-3",
    "itemName": "Legendary Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 3,
      "category": "Helms",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-4",
    "itemName": "Bone Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 4,
      "category": "Helms",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-5",
    "itemName": "Leather Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 5,
      "category": "Helms",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-6",
    "itemName": "Scale Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 6,
      "category": "Helms",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-7",
    "itemName": "Sphinx Mask",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 7,
      "category": "Helms",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-8",
    "itemName": "Brass Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 8,
      "category": "Helms",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-9",
    "itemName": "Plate Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 9,
      "category": "Helms",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-10",
    "itemName": "Vine Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 10,
      "category": "Helms",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "7-11",
    "itemName": "Silk Helm",
    "technicalIdentifiers": {
      "itemType": 7,
      "itemIndex": 11,
      "category": "Helms",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-0",
    "itemName": "Bronze Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 0,
      "category": "Armors",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-1",
    "itemName": "Dragon Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 1,
      "category": "Armors",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-2",
    "itemName": "Pad Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 2,
      "category": "Armors",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-3",
    "itemName": "Legendary Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 3,
      "category": "Armors",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-4",
    "itemName": "Bone Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 4,
      "category": "Armors",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-5",
    "itemName": "Leather Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 5,
      "category": "Armors",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-6",
    "itemName": "Scale Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 6,
      "category": "Armors",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-7",
    "itemName": "Sphinx Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 7,
      "category": "Armors",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-8",
    "itemName": "Brass Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 8,
      "category": "Armors",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-9",
    "itemName": "Plate Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 9,
      "category": "Armors",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-10",
    "itemName": "Vine Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 10,
      "category": "Armors",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "8-11",
    "itemName": "Silk Armor",
    "technicalIdentifiers": {
      "itemType": 8,
      "itemIndex": 11,
      "category": "Armors",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-0",
    "itemName": "Bronze Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 0,
      "category": "Pants",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-1",
    "itemName": "Dragon Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 1,
      "category": "Pants",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-2",
    "itemName": "Pad Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 2,
      "category": "Pants",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-3",
    "itemName": "Legendary Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 3,
      "category": "Pants",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-4",
    "itemName": "Bone Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 4,
      "category": "Pants",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-5",
    "itemName": "Leather Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 5,
      "category": "Pants",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-6",
    "itemName": "Scale Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 6,
      "category": "Pants",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-7",
    "itemName": "Sphinx Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 7,
      "category": "Pants",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-8",
    "itemName": "Brass Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 8,
      "category": "Pants",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-9",
    "itemName": "Plate Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 9,
      "category": "Pants",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-10",
    "itemName": "Vine Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 10,
      "category": "Pants",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "9-11",
    "itemName": "Silk Pants",
    "technicalIdentifiers": {
      "itemType": 9,
      "itemIndex": 11,
      "category": "Pants",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-0",
    "itemName": "Bronze Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 0,
      "category": "Gloves",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-1",
    "itemName": "Dragon Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 1,
      "category": "Gloves",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-2",
    "itemName": "Pad Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 2,
      "category": "Gloves",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-3",
    "itemName": "Legendary Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 3,
      "category": "Gloves",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-4",
    "itemName": "Bone Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 4,
      "category": "Gloves",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-5",
    "itemName": "Leather Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 5,
      "category": "Gloves",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-6",
    "itemName": "Scale Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 6,
      "category": "Gloves",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-7",
    "itemName": "Sphinx Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 7,
      "category": "Gloves",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-8",
    "itemName": "Brass Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 8,
      "category": "Gloves",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-9",
    "itemName": "Plate Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 9,
      "category": "Gloves",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-10",
    "itemName": "Vine Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 10,
      "category": "Gloves",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "10-11",
    "itemName": "Silk Gloves",
    "technicalIdentifiers": {
      "itemType": 10,
      "itemIndex": 11,
      "category": "Gloves",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-0",
    "itemName": "Bronze Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 0,
      "category": "Boots",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-1",
    "itemName": "Dragon Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 1,
      "category": "Boots",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-2",
    "itemName": "Pad Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 2,
      "category": "Boots",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-3",
    "itemName": "Legendary Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 3,
      "category": "Boots",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-4",
    "itemName": "Bone Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 4,
      "category": "Boots",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-5",
    "itemName": "Leather Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 5,
      "category": "Boots",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-6",
    "itemName": "Scale Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 6,
      "category": "Boots",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-7",
    "itemName": "Sphinx Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 7,
      "category": "Boots",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-8",
    "itemName": "Brass Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 8,
      "category": "Boots",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-9",
    "itemName": "Plate Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 9,
      "category": "Boots",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-10",
    "itemName": "Vine Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 10,
      "category": "Boots",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "11-11",
    "itemName": "Silk Boots",
    "technicalIdentifiers": {
      "itemType": 11,
      "itemIndex": 11,
      "category": "Boots",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-0",
    "itemName": "Wings of Elf",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 0,
      "category": "Wings",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-1",
    "itemName": "Wings of Heaven",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 1,
      "category": "Wings",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-2",
    "itemName": "Wings of Satan",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 2,
      "category": "Wings",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-3",
    "itemName": "Wings of Spirits",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 3,
      "category": "Wings",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-4",
    "itemName": "Wings of Soul",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 4,
      "category": "Wings",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-5",
    "itemName": "Wings of Dragon",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 5,
      "category": "Wings",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-6",
    "itemName": "Wings of Darkness",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 6,
      "category": "Wings",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-36",
    "itemName": "Wing of Storm",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 36,
      "category": "Wings",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-37",
    "itemName": "Wing of Eternal",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 37,
      "category": "Wings",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-38",
    "itemName": "Wing of Illusion",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 38,
      "category": "Wings",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-39",
    "itemName": "Wing of Ruin",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 39,
      "category": "Wings",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "12-40",
    "itemName": "Cape of Emperor",
    "technicalIdentifiers": {
      "itemType": 12,
      "itemIndex": 40,
      "category": "Wings",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-8",
    "itemName": "Ring of Ice",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 8,
      "category": "Pets/Rings/Pendents",
      "coin0": 10000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-9",
    "itemName": "Ring of Poison",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 9,
      "category": "Pets/Rings/Pendents",
      "coin0": 20000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-21",
    "itemName": "Ring of Fire",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 21,
      "category": "Pets/Rings/Pendents",
      "coin0": 30000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-22",
    "itemName": "Ring of Earth",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 22,
      "category": "Pets/Rings/Pendents",
      "coin0": 15000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-23",
    "itemName": "Ring of Wind",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 23,
      "category": "Pets/Rings/Pendents",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-24",
    "itemName": "Ring of Magic",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 24,
      "category": "Pets/Rings/Pendents",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-12",
    "itemName": "Pendant of Lighting",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 12,
      "category": "Pets/Rings/Pendents",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-13",
    "itemName": "Pendant of Fire",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 13,
      "category": "Pets/Rings/Pendents",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-25",
    "itemName": "Pendant of Ice",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 25,
      "category": "Pets/Rings/Pendents",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-26",
    "itemName": "Pendant of Wind",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 26,
      "category": "Pets/Rings/Pendents",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-27",
    "itemName": "Pendant of Water",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 27,
      "category": "Pets/Rings/Pendents",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  },
  {
    "legacyKey": "13-28",
    "itemName": "Pendant of Ability",
    "technicalIdentifiers": {
      "itemType": 13,
      "itemIndex": 28,
      "category": "Pets/Rings/Pendents",
      "coin0": 25000,
      "coin1": 0,
      "coin2": 0,
      "durationDays": "PERMANENT",
      "sourceFile": "CustomXShop.txt"
    }
  }
]
