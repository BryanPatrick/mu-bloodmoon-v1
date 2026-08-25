<template>
  <div class="grid gap-3">
    <div>
      <p class="text-sm font-black text-white">{{ slotDef.label }}</p>
      <p class="text-[11px] text-white/45">{{ slotDef.description }}</p>
      <span class="bm-admin-chip mt-1 inline-block">{{ slotDef.type }}</span>
    </div>

    <!-- IMAGE / asset REFERENCE -->
    <div v-if="slotDef.type === 'IMAGE' || assetReferenceKind" class="grid gap-2">
      <div class="grid grid-cols-4 gap-1">
        <button
          v-for="asset in assets" :key="asset.id as string"
          class="aspect-square overflow-hidden rounded border"
          :class="value === asset.id ? 'border-crimson-400' : 'border-white/10'"
          type="button" @click="value = asset.id as string"
        >
          <img v-if="asset.publicUrl" :src="asset.publicUrl as string" class="h-full w-full object-cover" alt="">
          <span v-else class="flex h-full items-center justify-center text-[9px] text-white/30">sem preview</span>
        </button>
      </div>
      <button v-if="value" class="bm-admin-action w-fit" type="button" @click="value = null">Remover selecao</button>
      <label class="bm-admin-label">Enviar novo asset
        <input type="file" accept="image/png,image/jpeg,image/webp" class="bm-admin-field" @change="onFile">
      </label>
      <p v-if="uploadError" class="text-[10px] text-red-400">{{ uploadError }}</p>
    </div>

    <!-- REFERENCE (knowledge entry) -->
    <label v-else-if="slotDef.type === 'REFERENCE'" class="bm-admin-label">ID da entrada (News/Event)
      <input v-model="referenceValue" class="bm-admin-field" placeholder="ex.: fixture-event-1">
    </label>

    <!-- TEXT / RICH_TEXT_LIMITED -->
    <label v-else-if="slotDef.type === 'TEXT' || slotDef.type === 'RICH_TEXT_LIMITED'" class="bm-admin-label">
      Valor ({{ (String(value || '')).length }}{{ maxLength ? `/${maxLength}` : '' }})
      <textarea v-model="textValue" class="bm-admin-field min-h-20" :maxlength="maxLength" />
    </label>

    <!-- LINK -->
    <label v-else-if="slotDef.type === 'LINK'" class="bm-admin-label">URL
      <input v-model="textValue" class="bm-admin-field" type="url" placeholder="https://">
    </label>

    <!-- BOOLEAN -->
    <label v-else-if="slotDef.type === 'BOOLEAN'" class="flex items-center gap-2 text-xs font-bold text-white/80">
      <input v-model="boolValue" type="checkbox"> Ativo
    </label>

    <!-- DATE_TIME -->
    <label v-else-if="slotDef.type === 'DATE_TIME'" class="bm-admin-label">Data/hora
      <input v-model="dateValue" class="bm-admin-field" type="datetime-local">
    </label>

    <!-- ORDERED_LIST -->
    <div v-else-if="slotDef.type === 'ORDERED_LIST'" class="grid gap-2">
      <div v-for="(item, index) in listValue" :key="index" class="grid gap-1 rounded border border-white/10 bg-white/5 p-2">
        <div v-for="(fieldType, key) in itemShape" :key="key" class="grid grid-cols-[70px_1fr] items-center gap-1 text-[11px]">
          <span class="text-white/40">{{ key }}</span>
          <input v-if="fieldType === 'BOOLEAN'" type="checkbox" :checked="!!item[key]" @change="setItemField(index, key, ($event.target as HTMLInputElement).checked)">
          <input v-else class="bm-admin-field" :value="item[key] ?? ''" @input="setItemField(index, key, ($event.target as HTMLInputElement).value)">
        </div>
        <button class="bm-admin-danger w-fit" type="button" @click="removeItem(index)">Remover</button>
      </div>
      <button v-if="!maxItems || listValue.length < maxItems" class="bm-admin-action w-fit" type="button" @click="addItem">Adicionar item</button>
      <p class="text-[10px] text-white/35">{{ listValue.length }}{{ maxItems ? `/${maxItems}` : '' }} item(ns)</p>
    </div>

    <div v-else class="text-[11px] text-white/40">Tipo sem editor dedicado ainda: {{ slotDef.type }}</div>

    <!-- Visual tokens -->
    <div v-if="slotDef.visualTokens.length" class="grid gap-2 border-t border-white/10 pt-2">
      <p class="bm-admin-label">Tokens visuais</p>
      <label v-for="axis in slotDef.visualTokens" :key="axis" class="grid grid-cols-[110px_1fr] items-center gap-1 text-[11px]">
        <span class="text-white/40">{{ axis }}</span>
        <select v-model="tokens[axis]" class="bm-admin-field">
          <option value="">(padrao)</option>
          <option v-for="opt in tokenOptions[axis]" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </label>
    </div>

    <div class="flex justify-end gap-2 border-t border-white/10 pt-2">
      <button class="bm-admin-primary" type="button" :disabled="saving" @click="save"><Save :size="14" /> {{ saving ? 'Salvando...' : 'Salvar rascunho' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Save } from 'lucide-vue-next'

type SlotDef = { id: string; page: string; label: string; description: string; type: string; required: boolean; constraints: Record<string, unknown>; visualTokens: string[]; defaultValue: unknown }
type DraftEntry = { definition: SlotDef; draft: { value: unknown; tokens: Record<string, string> }; published: unknown }

const props = defineProps<{ slotDef: SlotDef; entry: DraftEntry | null; assets: Array<Record<string, unknown>> }>()
const emit = defineEmits<{ save: [payload: { value: unknown; tokens?: Record<string, string> }]; loadAssets: [category?: string]; uploadAsset: [payload: { name: string; category: string; dataUrl: string }] }>()

const FONT_TOKENS = ['DISPLAY', 'SERIF', 'UI', 'COMPACT']
const FONT_SIZE_TOKENS = ['SM', 'MD', 'LG', 'XL', 'DISPLAY']
const COLOR_TOKENS = ['TEXT_PRIMARY', 'TEXT_MUTED', 'CRIMSON', 'GOLD', 'PURPLE', 'SUCCESS', 'WARNING']
const ALIGNMENT_TOKENS = ['START', 'CENTER', 'END']
const OPACITY_TOKENS = ['FULL', 'MUTED', 'FAINT']
const tokenOptions: Record<string, string[]> = {
  fontToken: FONT_TOKENS,
  fontSizeToken: FONT_SIZE_TOKENS,
  textColorToken: COLOR_TOKENS,
  accentColorToken: COLOR_TOKENS,
  alignmentToken: ALIGNMENT_TOKENS,
  opacityToken: OPACITY_TOKENS
}

const value = ref<unknown>(props.entry?.draft.value ?? props.slotDef.defaultValue)
const tokens = reactive<Record<string, string>>({ ...(props.entry?.draft.tokens || {}) })
const saving = ref(false)
const uploadError = ref('')

watch(() => props.slotDef.id, () => {
  value.value = props.entry?.draft.value ?? props.slotDef.defaultValue
  Object.keys(tokens).forEach((k) => delete tokens[k])
  Object.assign(tokens, props.entry?.draft.tokens || {})
})

const maxLength = computed(() => props.slotDef.constraints.maxLength as number | undefined)
const maxItems = computed(() => props.slotDef.constraints.maxItems as number | undefined)
const itemShape = computed(() => (props.slotDef.constraints.itemShape as Record<string, string>) || {})
const assetReferenceKind = computed(() => props.slotDef.type === 'REFERENCE' && props.slotDef.constraints.referenceKind === 'LAUNCHER_ASSET')

const textValue = computed({ get: () => (typeof value.value === 'string' ? value.value : ''), set: (v: string) => { value.value = v } })
const boolValue = computed({ get: () => value.value === true, set: (v: boolean) => { value.value = v } })
const referenceValue = computed({ get: () => (typeof value.value === 'string' ? value.value : ''), set: (v: string) => { value.value = v || null } })
const dateValue = computed({
  get: () => (typeof value.value === 'string' ? value.value.slice(0, 16) : ''),
  set: (v: string) => { value.value = v ? new Date(v).toISOString() : null }
})
const listValue = computed<Array<Record<string, unknown>>>({
  get: () => (Array.isArray(value.value) ? (value.value as Array<Record<string, unknown>>) : []),
  set: (v) => { value.value = v }
})

function setItemField(index: number, key: string, val: unknown) {
  const next = [...listValue.value]
  next[index] = { ...next[index], [key]: val }
  listValue.value = next
}
function addItem() {
  const blank: Record<string, unknown> = {}
  for (const [key, type] of Object.entries(itemShape.value)) blank[key] = type === 'BOOLEAN' ? true : ''
  listValue.value = [...listValue.value, blank]
}
function removeItem(index: number) {
  listValue.value = listValue.value.filter((_, i) => i !== index)
}

onMounted(() => {
  if (props.slotDef.type === 'IMAGE' || assetReferenceKind.value) {
    emit('loadAssets', props.slotDef.constraints.assetCategory as string | undefined)
  }
})
watch(() => props.slotDef.id, () => {
  if (props.slotDef.type === 'IMAGE' || assetReferenceKind.value) {
    emit('loadAssets', props.slotDef.constraints.assetCategory as string | undefined)
  }
})

function onFile(event: Event) {
  uploadError.value = ''
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { uploadError.value = 'Maximo de 5 MB.'; return }
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = String(reader.result)
    emit('uploadAsset', { name: file.name, category: (props.slotDef.constraints.assetCategory as string) || 'SYSTEM', dataUrl })
  }
  reader.onerror = () => { uploadError.value = 'Falha ao ler o arquivo.' }
  reader.readAsDataURL(file)
}

function save() {
  saving.value = true
  const cleanTokens = Object.fromEntries(Object.entries(tokens).filter(([, v]) => v))
  emit('save', { value: value.value, tokens: Object.keys(cleanTokens).length ? cleanTokens : undefined })
  saving.value = false
}
</script>
