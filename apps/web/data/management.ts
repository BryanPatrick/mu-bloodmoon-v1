import type { UserRole } from '~/data/security'

export type CurrencyCode = 'WCoin' | 'Goblin Point' | 'Hunt Point'

export type ManagedAccountStatus = 'Ativa' | 'Bloqueada' | 'Pendente'

export type ManagedAccount = {
  id: string
  username: string
  name: string
  email: string
  role: UserRole
  status: ManagedAccountStatus
  personalIdMask: string
  createdAt: string
  lastLoginAt: string
  characters: number
  currencies: Record<CurrencyCode, number>
}

export type ManagedCharacter = {
  id: string
  ownerUsername: string
  name: string
  class: string
  level: number
  reset: number
  masterReset: number
  map: string
  status: 'Online' | 'Offline'
  guild: string
  pkStatus: string
}

export type ShopProduct = {
  id: string
  name: string
  short: string
  category: string
  description: string
  price: number
  currency: CurrencyCode
  status: 'Ativo' | 'Rascunho'
  stock: 'Ilimitado' | number
}

export type RechargePack = {
  id: string
  currency: CurrencyCode
  amount: number
  bonus: number
  price: string
  highlight?: boolean
}

export const managedAccounts: ManagedAccount[] = [
  {
    id: 'acc-admin',
    username: 'admin',
    name: 'admin',
    email: 'admin@bloodmoon.local',
    role: 'admin',
    status: 'Ativa',
    personalIdMask: '***-**-1001',
    createdAt: '2026-06-01T10:00:00.000Z',
    lastLoginAt: '2026-06-16T13:35:00.000Z',
    characters: 3,
    currencies: {
      WCoin: 1250,
      'Goblin Point': 340,
      'Hunt Point': 8750
    }
  },
  {
    id: 'acc-player',
    username: 'player',
    name: 'player',
    email: 'player@bloodmoon.local',
    role: 'player',
    status: 'Ativa',
    personalIdMask: '***-**-2208',
    createdAt: '2026-06-08T17:20:00.000Z',
    lastLoginAt: '2026-06-15T22:12:00.000Z',
    characters: 2,
    currencies: {
      WCoin: 50,
      'Goblin Point': 0,
      'Hunt Point': 320
    }
  },
  {
    id: 'acc-gm',
    username: 'gmtest',
    name: 'GM Teste',
    email: 'gm@bloodmoon.local',
    role: 'game-master',
    status: 'Pendente',
    personalIdMask: '***-**-7781',
    createdAt: '2026-06-11T09:42:00.000Z',
    lastLoginAt: '2026-06-14T11:05:00.000Z',
    characters: 1,
    currencies: {
      WCoin: 0,
      'Goblin Point': 0,
      'Hunt Point': 0
    }
  }
]

export const managedCharacters: ManagedCharacter[] = [
  {
    id: 'char-moonelf',
    ownerUsername: 'admin',
    name: 'MoonElf',
    class: 'High Elf',
    level: 400,
    reset: 18,
    masterReset: 2,
    map: 'Noria',
    status: 'Online',
    guild: 'Blood Pact',
    pkStatus: 'Hero'
  },
  {
    id: 'char-lordadmin',
    ownerUsername: 'admin',
    name: 'LordAdmin',
    class: 'Dark Lord',
    level: 380,
    reset: 11,
    masterReset: 1,
    map: 'Lorencia',
    status: 'Offline',
    guild: 'Blood Pact',
    pkStatus: 'Commoner'
  },
  {
    id: 'char-bloodmage',
    ownerUsername: 'admin',
    name: 'BloodMage',
    class: 'Soul Master',
    level: 320,
    reset: 7,
    masterReset: 0,
    map: 'Devias',
    status: 'Offline',
    guild: '-',
    pkStatus: 'Commoner'
  },
  {
    id: 'char-playerelf',
    ownerUsername: 'player',
    name: 'FairyQueen',
    class: 'Fairy Elf',
    level: 275,
    reset: 4,
    masterReset: 0,
    map: 'Atlans',
    status: 'Offline',
    guild: '-',
    pkStatus: 'Commoner'
  }
]

export const shopProducts: ShopProduct[] = [
  {
    id: 'vip-bronze',
    name: 'Pacote VIP Bronze',
    short: 'VIP',
    category: 'VIP',
    description: 'Beneficios iniciais para evolucao e conforto.',
    price: 350,
    currency: 'WCoin',
    status: 'Ativo',
    stock: 'Ilimitado'
  },
  {
    id: 'rename-character',
    name: 'Troca de Nick',
    short: 'N',
    category: 'Servico',
    description: 'Servico de alteracao de nome de personagem.',
    price: 180,
    currency: 'WCoin',
    status: 'Ativo',
    stock: 'Ilimitado'
  },
  {
    id: 'extra-reset',
    name: 'Reset Extra',
    short: 'R',
    category: 'Servico',
    description: 'Credito de reset especial para temporada.',
    price: 120,
    currency: 'Goblin Point',
    status: 'Ativo',
    stock: 'Ilimitado'
  },
  {
    id: 'blood-box',
    name: 'Box Blood Moon',
    short: 'B',
    category: 'Evento',
    description: 'Caixa promocional com itens rotativos.',
    price: 900,
    currency: 'Hunt Point',
    status: 'Rascunho',
    stock: 250
  }
]

export const rechargePacks: RechargePack[] = [
  { id: 'wcoin-500', currency: 'WCoin', amount: 500, bonus: 0, price: '19,90' },
  { id: 'wcoin-1200', currency: 'WCoin', amount: 1200, bonus: 100, price: '39,90', highlight: true },
  { id: 'wcoin-2600', currency: 'WCoin', amount: 2600, bonus: 300, price: '79,90' },
  { id: 'wcoin-5500', currency: 'WCoin', amount: 5500, bonus: 800, price: '149,90' },
  { id: 'gp-340', currency: 'Goblin Point', amount: 340, bonus: 0, price: '19,90' },
  { id: 'gp-850', currency: 'Goblin Point', amount: 850, bonus: 50, price: '39,90' },
  { id: 'hp-1000', currency: 'Hunt Point', amount: 1000, bonus: 0, price: '14,90' },
  { id: 'hp-8750', currency: 'Hunt Point', amount: 8750, bonus: 1250, price: '99,90', highlight: true }
]
