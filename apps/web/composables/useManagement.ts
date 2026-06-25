import {
  managedAccounts,
  managedCharacters,
  rechargePacks,
  shopProducts,
  type CurrencyCode,
  type ManagedAccount,
  type ManagedAccountStatus,
  type ManagedCharacter,
  type RechargePack,
  type ShopProduct
} from '~/data/management'

export type PurchaseIntent = {
  id: string
  username: string
  productId: string
  productName: string
  price: number
  currency: CurrencyCode
  status: 'Preparada' | 'Concluida' | 'Cancelada'
  createdAt: string
}

export type RechargeIntent = {
  id: string
  username: string
  packId: string
  currency: CurrencyCode
  amount: number
  bonus: number
  price: string
  status: 'Preparada' | 'Paga' | 'Cancelada'
  createdAt: string
}

type ManagementState = {
  accounts: ManagedAccount[]
  characters: ManagedCharacter[]
  products: ShopProduct[]
  rechargePacks: RechargePack[]
  purchases: PurchaseIntent[]
  recharges: RechargeIntent[]
}

const storageKey = 'blood-moon-management-state'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const createInitialState = (): ManagementState => ({
  accounts: clone(managedAccounts),
  characters: clone(managedCharacters),
  products: clone(shopProducts),
  rechargePacks: clone(rechargePacks),
  purchases: [],
  recharges: []
})

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const useManagement = () => {
  const state = useState<ManagementState>('blood-moon-management-state', createInitialState)
  const isLoaded = useState('blood-moon-management-loaded', () => false)

  const persist = () => {
    if (import.meta.client) {
      localStorage.setItem(storageKey, JSON.stringify(state.value))
    }
  }

  const loadManagement = () => {
    if (!import.meta.client || isLoaded.value) {
      return
    }

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ManagementState>
        state.value = {
          accounts: parsed.accounts?.length ? parsed.accounts : clone(managedAccounts),
          characters: parsed.characters?.length ? parsed.characters : clone(managedCharacters),
          products: parsed.products?.length ? parsed.products : clone(shopProducts),
          rechargePacks: parsed.rechargePacks?.length ? parsed.rechargePacks : clone(rechargePacks),
          purchases: parsed.purchases || [],
          recharges: parsed.recharges || []
        }
      } else {
        state.value = createInitialState()
        persist()
      }
    } catch {
      state.value = createInitialState()
      localStorage.removeItem(storageKey)
      persist()
    } finally {
      isLoaded.value = true
    }
  }

  const resetManagement = () => {
    state.value = createInitialState()
    persist()
  }

  const exportManagement = () => JSON.stringify(state.value, null, 2)

  const importManagement = (rawValue: string) => {
    try {
      const parsed = JSON.parse(rawValue) as Partial<ManagementState>
      state.value = {
        accounts: parsed.accounts?.length ? parsed.accounts : clone(managedAccounts),
        characters: parsed.characters?.length ? parsed.characters : clone(managedCharacters),
        products: parsed.products?.length ? parsed.products : clone(shopProducts),
        rechargePacks: parsed.rechargePacks?.length ? parsed.rechargePacks : clone(rechargePacks),
        purchases: parsed.purchases || [],
        recharges: parsed.recharges || []
      }
      persist()
      return { ok: true, message: 'Base importada com sucesso.' }
    } catch {
      return { ok: false, message: 'JSON invalido. Revise o conteudo e tente novamente.' }
    }
  }

  const getAccountByUsername = (username?: string) =>
    state.value.accounts.find((account) => account.username === username)

  const getCharactersByUsername = (username?: string) =>
    state.value.characters.filter((character) => character.ownerUsername === username)

  const updateAccountStatus = (accountId: string, status: ManagedAccountStatus) => {
    const account = state.value.accounts.find((item) => item.id === accountId)
    if (!account) {
      return null
    }

    account.status = status
    persist()
    return account
  }

  const createPurchaseIntent = (username: string, product: ShopProduct) => {
    const purchase: PurchaseIntent = {
      id: createId('purchase'),
      username,
      productId: product.id,
      productName: product.name,
      price: product.price,
      currency: product.currency,
      status: 'Preparada',
      createdAt: new Date().toISOString()
    }

    state.value.purchases.unshift(purchase)
    persist()
    return purchase
  }

  const createRechargeIntent = (username: string, pack: RechargePack) => {
    const recharge: RechargeIntent = {
      id: createId('recharge'),
      username,
      packId: pack.id,
      currency: pack.currency,
      amount: pack.amount,
      bonus: pack.bonus,
      price: pack.price,
      status: 'Preparada',
      createdAt: new Date().toISOString()
    }

    state.value.recharges.unshift(recharge)
    persist()
    return recharge
  }

  const upsertProduct = (product: ShopProduct) => {
    const existingIndex = state.value.products.findIndex((item) => item.id === product.id)
    if (existingIndex >= 0) {
      state.value.products.splice(existingIndex, 1, product)
    } else {
      state.value.products.unshift(product)
    }

    persist()
    return product
  }

  const deleteProduct = (productId: string) => {
    const product = state.value.products.find((item) => item.id === productId)
    if (!product) {
      return null
    }

    state.value.products = state.value.products.filter((item) => item.id !== productId)
    persist()
    return product
  }

  const upsertRechargePack = (pack: RechargePack) => {
    const existingIndex = state.value.rechargePacks.findIndex((item) => item.id === pack.id)
    if (existingIndex >= 0) {
      state.value.rechargePacks.splice(existingIndex, 1, pack)
    } else {
      state.value.rechargePacks.unshift(pack)
    }

    persist()
    return pack
  }

  const deleteRechargePack = (packId: string) => {
    const pack = state.value.rechargePacks.find((item) => item.id === packId)
    if (!pack) {
      return null
    }

    state.value.rechargePacks = state.value.rechargePacks.filter((item) => item.id !== packId)
    persist()
    return pack
  }

  const updatePurchaseStatus = (purchaseId: string, status: PurchaseIntent['status']) => {
    const purchase = state.value.purchases.find((item) => item.id === purchaseId)
    if (!purchase) {
      return { ok: false, message: 'Compra nao encontrada.' }
    }

    const previousStatus = purchase.status
    const account = getAccountByUsername(purchase.username)
    if (status === 'Concluida') {
      if (!account) {
        return { ok: false, message: 'Conta da compra nao encontrada.' }
      }

      if (previousStatus !== 'Concluida') {
        const balance = account.currencies[purchase.currency] || 0
        if (balance < purchase.price) {
          return { ok: false, message: 'Saldo insuficiente para concluir a compra.' }
        }

        account.currencies[purchase.currency] = balance - purchase.price
      }
    }

    if (previousStatus === 'Concluida' && status === 'Cancelada' && account) {
      account.currencies[purchase.currency] = (account.currencies[purchase.currency] || 0) + purchase.price
    }

    purchase.status = status
    persist()
    return { ok: true, message: `Compra marcada como ${status}.`, purchase }
  }

  const updateRechargeStatus = (rechargeId: string, status: RechargeIntent['status']) => {
    const recharge = state.value.recharges.find((item) => item.id === rechargeId)
    if (!recharge) {
      return { ok: false, message: 'Recarga nao encontrada.' }
    }

    const previousStatus = recharge.status
    const account = getAccountByUsername(recharge.username)
    if (status === 'Paga' && previousStatus !== 'Paga') {
      if (!account) {
        return { ok: false, message: 'Conta da recarga nao encontrada.' }
      }

      account.currencies[recharge.currency] = (account.currencies[recharge.currency] || 0) + recharge.amount + recharge.bonus
    }

    if (previousStatus === 'Paga' && status === 'Cancelada' && account) {
      account.currencies[recharge.currency] = Math.max(0, (account.currencies[recharge.currency] || 0) - recharge.amount - recharge.bonus)
    }

    recharge.status = status
    persist()
    return { ok: true, message: `Recarga marcada como ${status}.`, recharge }
  }

  const purchasesFor = (username?: string) =>
    state.value.purchases.filter((purchase) => purchase.username === username)

  const rechargesFor = (username?: string) =>
    state.value.recharges.filter((recharge) => recharge.username === username)

  return {
    state,
    loadManagement,
    resetManagement,
    exportManagement,
    importManagement,
    persist,
    getAccountByUsername,
    getCharactersByUsername,
    updateAccountStatus,
    createPurchaseIntent,
    createRechargeIntent,
    updatePurchaseStatus,
    updateRechargeStatus,
    upsertProduct,
    deleteProduct,
    upsertRechargePack,
    deleteRechargePack,
    purchasesFor,
    rechargesFor
  }
}
