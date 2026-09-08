// PHASE S (2026-09-02) -- generated snapshot of Bryan's Phase R
// classification, one entry per real X-Shop/CashShop catalog row (168 +
// 12 = 180 total). Generated from docs/economy/xshop-full-inventory.csv
// and docs/economy/cashshop-bryan-decision-table.md -- see
// legacy-catalog-config.service.ts#seedFromXshopDecisionData for how
// this is consumed. A future re-review must regenerate this file
// alongside the ADR update, same discipline as legacy-catalog-policy.ts.

export type CashshopSeedEntry = {
  legacyKey: string
  itemName: string
  decision: 'GREEN_CANDIDATE_NOT_APPROVED' | 'RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST'
  technicalIdentifiers: Record<string, unknown>
}

export const CASHSHOP_SEED_ENTRIES: readonly CashshopSeedEntry[] = [
  {
    "legacyKey": "6703",
    "itemName": "Blood Castle Ticket",
    "decision": "GREEN_CANDIDATE_NOT_APPROVED",
    "technicalIdentifiers": {
      "itemIndex": 6703,
      "coinValue": 5,
      "coinIndex": 508,
      "durationSeconds": 0,
      "quantity": 10,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6702",
    "itemName": "Devil Square Ticket",
    "decision": "GREEN_CANDIDATE_NOT_APPROVED",
    "technicalIdentifiers": {
      "itemIndex": 6702,
      "coinValue": 5,
      "coinIndex": 508,
      "durationSeconds": 0,
      "quantity": 10,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6704",
    "itemName": "Kalima Ticket",
    "decision": "GREEN_CANDIDATE_NOT_APPROVED",
    "technicalIdentifiers": {
      "itemIndex": 6704,
      "coinValue": 5,
      "coinIndex": 508,
      "durationSeconds": 0,
      "quantity": 10,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6656",
    "itemName": "Guardian Angel",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6656,
      "coinValue": 3,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6657",
    "itemName": "Imp",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6657,
      "coinValue": 3,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6659",
    "itemName": "Horn of Dinorant",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6659,
      "coinValue": 3,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6720",
    "itemName": "Demon",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6720,
      "coinValue": 6,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6721",
    "itemName": "Spirit of Guardian",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6721,
      "coinValue": 5,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6723",
    "itemName": "Pet Rudolf",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6723,
      "coinValue": 4,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6736",
    "itemName": "Pet Panda",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6736,
      "coinValue": 10,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6762",
    "itemName": "Pet Unicorn",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6762,
      "coinValue": 4,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  },
  {
    "legacyKey": "6779",
    "itemName": "Pet Skeleton",
    "decision": "RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST",
    "technicalIdentifiers": {
      "itemIndex": 6779,
      "coinValue": 10,
      "coinIndex": 508,
      "durationSeconds": 604800,
      "quantity": 0,
      "sourceFile": "CashShopProduct.txt"
    }
  }
]
