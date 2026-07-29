<template>
  <div class="grid gap-5">
    <header class="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p class="bm-kicker">Comércio oficial</p><h1 class="mt-2 font-display text-4xl font-black uppercase">Loja Admin</h1><p class="mt-2 text-sm font-semibold text-white/60">Catálogo, workflow, pedidos, entregas e operação comercial em uma única área.</p></div>
      <button v-if="canProducts" class="bm-admin-primary" type="button" @click="openCreate"><Plus class="size-4" /> Novo produto</button>
    </header>

    <nav class="flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
      <button v-for="tab in visibleTabs" :key="tab.key" class="store-tab" :class="{ active: activeTab === tab.key }" type="button" @click="selectTab(tab.key)"><component :is="tab.icon" class="size-4" />{{ tab.label }}</button>
    </nav>

    <p v-if="notice" class="border px-4 py-3 text-sm font-bold" :class="noticeError ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'">{{ notice }}</p>

    <template v-if="activeTab === 'dashboard'">
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <article v-for="metric in dashboardMetrics" :key="metric.label" class="bm-panel rounded-md p-4"><p class="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">{{ metric.label }}</p><strong class="mt-2 block font-display text-2xl">{{ metric.value }}</strong></article>
      </section>
      <section class="grid gap-4 lg:grid-cols-2">
        <article class="bm-panel rounded-md p-4"><p class="bm-kicker">Mais vendidos</p><div v-for="item in dashboard.topProducts || []" :key="item.productId" class="mt-3 flex justify-between border-t border-white/10 pt-3 text-xs"><strong>{{ item.name }}</strong><span>{{ item.sales }} vendas</span></div><AdminEmptyState v-if="!dashboard.topProducts?.length" title="Sem vendas no período" description="Os produtos vendidos aparecerão aqui." /></article>
        <article class="bm-panel rounded-md p-4"><p class="bm-kicker">Alertas de estoque</p><div v-for="item in dashboard.lowStock || []" :key="item.id" class="mt-3 flex justify-between border-t border-white/10 pt-3 text-xs"><strong>{{ item.name }}</strong><span class="text-ember">{{ item.stock }} restantes</span></div><AdminEmptyState v-if="!dashboard.lowStock?.length" title="Estoque saudável" description="Nenhuma variante atingiu o limite de alerta." /></article>
      </section>
      <section v-if="dashboard.financial" class="bm-panel grid gap-3 rounded-md p-4 sm:grid-cols-3"><article><p class="metric-label">Vendas</p><strong class="metric-value">{{ dashboard.financial.sales }}</strong></article><article><p class="metric-label">Receita</p><strong class="metric-value">{{ dashboard.financial.revenue }}</strong></article><article><p class="metric-label">Ticket médio</p><strong class="metric-value">{{ dashboard.financial.averageTicket }}</strong></article></section>
    </template>

    <template v-else-if="activeTab === 'products'">
      <section class="bm-panel grid gap-3 rounded-md p-4 lg:grid-cols-[1fr_180px_180px_auto_auto]">
        <input v-model="productQuery.search" class="field" placeholder="Buscar nome, chave ou código" @input="debouncedProducts">
        <select v-model="productQuery.status" class="field" @change="loadProducts"><option value="">Todos os status</option><option v-for="status in statuses" :key="status">{{ status }}</option></select>
        <select v-model="productQuery.filter" class="field" @change="loadProducts"><option value="">Todos</option><option value="missingImage">Sem imagem</option><option value="missingPrice">Sem preço</option><option value="ambiguous">Não identificados</option></select>
        <button v-if="canProducts" class="bm-admin-action" type="button" @click="importCatalog(false)">Importar catálogo</button>
        <button class="bm-admin-action" type="button" @click="exportProducts"><Download class="size-4" /> Exportar</button>
      </section>
      <section v-if="selectedProducts.length" class="bm-panel flex flex-wrap items-center gap-3 rounded-md p-3">
        <strong class="mr-auto text-xs">{{ selectedProducts.length }} selecionados</strong>
        <select v-model="bulkProductAction" class="field max-w-52"><option value="">Escolher ação</option><option value="submit-review">Enviar para revisão</option><option value="archive">Arquivar</option><option value="restore">Restaurar</option><option value="deactivate">Ocultar</option><option value="delete">Excluir</option></select>
        <button class="bm-admin-primary" :disabled="!bulkProductAction" type="button" @click="runBulkProductAction">Aplicar em lote</button>
      </section>
      <section class="bm-panel overflow-hidden rounded-md">
        <div class="overflow-x-auto"><table class="w-full min-w-[980px] text-left text-xs"><thead><tr><th class="p-3"><input type="checkbox" :checked="allProductsSelected" aria-label="Selecionar produtos da página" @change="toggleAllProducts"></th><th>Produto</th><th>Categoria</th><th>Status</th><th>Preço</th><th>Estoque</th><th>Atualização</th><th class="pr-3 text-right">Ações</th></tr></thead><tbody><tr v-for="product in products" :key="product.id" class="border-t border-white/10"><td class="p-3"><input v-model="selectedProducts" type="checkbox" :value="product.id" :aria-label="`Selecionar ${product.name}`"></td><td><strong>{{ product.name || 'Sem nome' }}</strong><p class="text-[10px] text-white/35">{{ product.ambiguous ? 'Revisão obrigatória' : product.slug }}</p></td><td>{{ product.category }}</td><td><span class="status-pill">{{ product.status }}</span></td><td>{{ product.price }} {{ product.currency }}</td><td>{{ product.stock ?? '∞' }}</td><td>v{{ product.version || 1 }}</td><td class="pr-3"><div class="flex justify-end gap-1"><button class="icon-button" title="Editar" @click="openEdit(product)"><Pencil class="size-4" /></button><button v-if="canProducts" class="icon-button" title="Duplicar" @click="duplicate(product)"><Copy class="size-4" /></button><button class="icon-button" title="Workflow e variantes" @click="openOperations(product)"><Activity class="size-4" /></button></div></td></tr></tbody></table></div>
        <AdminEmptyState v-if="!products.length" title="Nenhum produto encontrado" description="Importe o catálogo ou crie um produto manualmente." />
        <div class="flex items-center justify-between p-4 text-xs text-white/45"><span>{{ productTotal }} produtos</span><div class="flex gap-2"><button class="bm-admin-action" :disabled="productPage <= 1" @click="productPage--; loadProducts()">Anterior</button><span class="px-2 py-2">{{ productPage }} / {{ productPages }}</span><button class="bm-admin-action" :disabled="productPage >= productPages" @click="productPage++; loadProducts()">Próxima</button></div></div>
      </section>
    </template>

    <template v-else-if="activeTab === 'categories'">
      <section v-if="canCategories" class="bm-panel grid gap-3 rounded-md p-4 md:grid-cols-[1fr_1fr_120px_auto]"><input v-model="categoryForm.name" class="field" placeholder="Nome da categoria"><input v-model="categoryForm.description" class="field" placeholder="Descrição"><input v-model.number="categoryForm.sortOrder" class="field" min="0" type="number"><button class="bm-admin-primary" @click="saveCategory">{{ categoryForm.id ? 'Atualizar' : 'Criar' }}</button></section>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><article v-for="category in categories" :key="category.id" class="bm-panel rounded-md p-4"><div class="flex justify-between"><div><strong class="font-display text-xl">{{ category.name }}</strong><p class="mt-1 text-xs text-white/45">{{ category.description || 'Sem descrição' }}</p></div><span class="status-pill">{{ category.active ? 'ATIVA' : 'INATIVA' }}</span></div><div v-if="canCategories" class="mt-4 flex gap-2"><button class="bm-admin-action" @click="editCategory(category)">Editar</button><button class="bm-admin-action" @click="categoryAction(category, category.archivedAt ? 'restore' : 'archive')">{{ category.archivedAt ? 'Restaurar' : 'Arquivar' }}</button><button class="bm-admin-danger" @click="categoryAction(category, 'delete')">Excluir</button></div></article></section>
    </template>

    <template v-else-if="activeTab === 'orders'">
      <section class="bm-panel grid gap-3 rounded-md p-4 md:grid-cols-[1fr_220px]"><input v-model="orderQuery.search" class="field" placeholder="Pedido, jogador, produto ou correlationId" @input="debouncedOrders"><select v-model="orderQuery.status" class="field" @change="loadOrders"><option value="">Todos os status</option><option v-for="status in orderStatuses" :key="status">{{ status }}</option></select></section>
      <section class="grid gap-3"><article v-for="order in orders" :key="order.id" class="bm-panel grid gap-4 rounded-md p-4 lg:grid-cols-[1fr_auto]"><div><div class="flex flex-wrap gap-2"><span class="status-pill">{{ order.status }}</span><span class="status-pill">{{ order.currency }}</span></div><h3 class="mt-2 font-display text-xl">{{ order.product.name }}</h3><p class="mt-1 text-xs text-white/45">{{ order.account.username }} · {{ order.id }} · {{ order.correlationId }}</p><p class="mt-2 text-sm font-black text-ember">{{ order.price }} {{ order.currency }}</p></div><div class="grid min-w-52 grid-cols-2 gap-2"><button class="bm-admin-action" @click="openOrder(order)">Detalhes</button><button class="bm-admin-action" @click="orderAction(order, 'mark-paid')">Confirmar pagamento</button><button class="bm-admin-action" @click="orderAction(order, 'deliver')">Entregar</button><button class="bm-admin-action" @click="orderAction(order, 'manual-review')">Revisão</button><button class="bm-admin-danger col-span-2" @click="orderAction(order, canRefund ? 'refund' : 'cancel')">{{ canRefund ? 'Estornar' : 'Cancelar' }}</button></div></article><AdminEmptyState v-if="!orders.length" title="Nenhum pedido" description="Pedidos e sua linha do tempo aparecerão aqui." /></section>
    </template>

    <template v-else-if="activeTab === 'deliveries'">
      <section class="bm-panel grid gap-3 rounded-md p-4 md:grid-cols-[1fr_220px]"><input v-model="deliveryQuery.search" class="field" placeholder="Item, conta ou correlationId" @input="debouncedDeliveries"><select v-model="deliveryQuery.status" class="field" @change="loadDeliveries"><option value="">Todos os status</option><option v-for="status in deliveryStatuses" :key="status">{{ status }}</option></select></section>
      <section class="grid gap-3 lg:grid-cols-2"><article v-for="delivery in deliveries" :key="delivery.id" class="bm-panel rounded-md p-4"><div class="flex justify-between gap-3"><div><span class="status-pill">{{ delivery.status }}</span><h3 class="mt-2 font-display text-xl">{{ delivery.itemName }}</h3></div><strong>{{ delivery.attempts }}/{{ delivery.maxAttempts }}</strong></div><p class="mt-2 text-xs text-white/45">{{ delivery.target }} · {{ delivery.correlationId }}</p><p v-if="delivery.lastError" class="mt-2 text-xs text-red-200">{{ delivery.lastError }}</p><div class="mt-4 flex flex-wrap gap-2"><button class="bm-admin-action" @click="deliveryAction(delivery, 'process')">Processar</button><button class="bm-admin-action" @click="deliveryAction(delivery, 'complete')">Concluir</button><button class="bm-admin-action" @click="deliveryAction(delivery, 'reprocess')">Reprocessar</button><button class="bm-admin-danger" @click="deliveryAction(delivery, 'fail')">Falhou</button></div></article><AdminEmptyState v-if="!deliveries.length" title="Fila vazia" description="Entregas aguardando processamento aparecerão aqui." /></section>
    </template>

    <template v-else-if="activeTab === 'reports'">
      <section class="bm-panel grid gap-3 rounded-md p-4 sm:grid-cols-2"><label class="label">Início<input v-model="reportDates.from" class="field" type="date"></label><label class="label">Fim<input v-model="reportDates.to" class="field" type="date"></label><button class="bm-admin-primary sm:col-span-2" @click="loadReports">Atualizar relatório</button></section>
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><article v-for="metric in reportMetrics" :key="metric.label" class="bm-panel rounded-md p-4"><p class="metric-label">{{ metric.label }}</p><strong class="metric-value">{{ metric.value }}</strong></article></section>
    </template>

    <template v-else-if="activeTab === 'test'">
      <section class="bm-panel max-w-3xl rounded-md p-5"><p class="bm-kicker">Somente desenvolvimento</p><h2 class="mt-2 font-display text-2xl">Teste de produto</h2><p class="mt-2 text-xs text-white/48">Produção bloqueia esta operação, salvo quando uma proteção adicional é habilitada explicitamente no servidor.</p><div class="mt-5 grid gap-3 sm:grid-cols-2"><input v-model="testForm.productId" class="field" placeholder="ID do produto"><input v-model="testForm.variantId" class="field" placeholder="ID da variante (opcional)"><input v-model="testForm.testAccountId" class="field" placeholder="ID da conta de teste"><input v-model="testForm.testCharacter" class="field" placeholder="Personagem de teste"><label class="check"><input v-model="testForm.simulatePurchase" type="checkbox"> Simular compra</label><label class="check"><input v-model="testForm.testDelivery" type="checkbox"> Testar entrega</label><label class="check"><input v-model="testForm.rollback" type="checkbox"> Solicitar rollback</label></div><button class="bm-admin-primary mt-4" @click="runTest">Executar teste e gerar relatório</button></section>
    </template>

    <Teleport to="body">
      <div v-if="editorOpen" class="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
        <section class="mx-auto max-w-6xl border border-white/15 bg-zinc-950 p-5">
          <header class="flex justify-between border-b border-white/10 pb-4"><div><p class="bm-kicker">Produto da loja</p><h2 class="mt-2 font-display text-3xl">{{ form.name || 'Novo produto' }}</h2></div><button class="icon-button" @click="closeEditor"><X class="size-5" /></button></header>
          <form class="mt-5 grid gap-4 lg:grid-cols-4" @submit.prevent="saveProduct">
            <label class="label lg:col-span-2">Nome<input v-model="form.name" class="field" required></label><label class="label">Slug<input v-model="form.slug" class="field"></label><label class="label">Chave<input v-model="form.key" class="field"></label>
            <label class="label">Categoria<select v-model="form.categoryId" class="field"><option value="">Sem vínculo</option><option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label class="label">Nome da categoria<input v-model="form.category" class="field" required></label><label class="label">Preço base<input v-model.number="form.price" class="field" min="0" type="number"></label><label class="label">Moeda<select v-model="form.currency" class="field"><option v-for="currency in currencies" :key="currency">{{ currency }}</option></select></label>
            <label class="label lg:col-span-4">Resumo<textarea v-model="form.summary" class="field min-h-20" /></label><label class="label lg:col-span-4">Descrição<textarea v-model="form.description" class="field min-h-32" required /></label>
            <label class="label lg:col-span-2">Imagens, uma URL por linha<textarea v-model="form.images" class="field min-h-24" /><span class="mt-2 flex items-center gap-2"><label class="bm-admin-action cursor-pointer">Enviar imagem<input class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadProductImage"></label><small class="text-white/40">PNG, JPEG ou WebP, até 5 MB.</small></span></label><label class="label">Destino<select v-model="form.deliveryTarget" class="field"><option v-for="target in targets" :key="target">{{ target }}</option></select></label><label class="label">Estoque<input v-model.number="form.stock" class="field" min="0" type="number"></label>
            <label class="label">Limite por conta<input v-model.number="form.accountLimit" class="field" min="0" type="number"></label><label class="label">Limite por período<input v-model.number="form.periodLimit" class="field" min="0" type="number"></label><label class="label">Dias do período<input v-model.number="form.periodDays" class="field" min="0" type="number"></label><label class="check self-end"><input v-model="form.featured" type="checkbox"> Produto em destaque</label>
            <label class="label">Início da venda<input v-model="form.saleStartsAt" class="field" type="datetime-local"></label><label class="label">Fim da venda<input v-model="form.saleEndsAt" class="field" type="datetime-local"></label><label class="label">Código técnico<input v-model="form.technicalCode" class="field"></label><label class="label">Origem interna<input v-model="form.sourceOrigin" class="field"></label>
            <label class="label lg:col-span-2">Notas internas<textarea v-model="form.internalNotes" class="field min-h-20" /></label><label class="label">Descrição do trabalho<input v-model="form.workDescription" class="field"></label><label class="label">Evidência<input v-model="form.workEvidence" class="field"></label>
            <div class="flex gap-2 lg:col-span-4"><button class="bm-admin-primary" type="submit"><Save class="size-4" /> Salvar rascunho</button><button class="bm-admin-action" type="button" @click="closeEditor">Cancelar</button></div>
          </form>
        </section>
      </div>

      <div v-if="operationsOpen && activeProduct" class="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
        <section class="mx-auto max-w-6xl border border-white/15 bg-zinc-950 p-5">
          <header class="flex justify-between border-b border-white/10 pb-4"><div><p class="bm-kicker">Workflow e variantes</p><h2 class="mt-2 font-display text-3xl">{{ activeProduct.name || 'Produto sem nome' }}</h2></div><button class="icon-button" @click="operationsOpen=false"><X class="size-5" /></button></header>
          <div class="mt-5 grid gap-5 lg:grid-cols-2">
            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl">Workflow</h3><p class="mt-2 text-xs text-white/45">Status atual: {{ activeProduct.status }}</p><input v-model="transitionReason" class="field mt-3" placeholder="Justificativa"><input v-model="scheduleAt" class="field mt-2" type="datetime-local"><div class="mt-3 grid grid-cols-2 gap-2"><button v-if="canProducts" class="bm-admin-action" @click="transition('submit-review')">Enviar para revisão</button><button v-if="canReview" class="bm-admin-action" @click="transition('approve')">Aprovar</button><button v-if="canReview" class="bm-admin-action" @click="transition('reject')">Rejeitar</button><button v-if="canPublish" class="bm-admin-action" @click="transition('publish')">Publicar</button><button v-if="canPublish" class="bm-admin-action" @click="transition('schedule')">Agendar</button><button v-if="canPublish" class="bm-admin-action" @click="transition('deactivate')">Ocultar</button><button v-if="canProducts" class="bm-admin-action" @click="transition(activeProduct.status === 'ARCHIVED' ? 'restore' : 'archive')">{{ activeProduct.status === 'ARCHIVED' ? 'Restaurar' : 'Arquivar' }}</button><button v-if="canProducts" class="bm-admin-danger" @click="transition('delete')">Excluir</button></div></section>
            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl">Nova variante</h3><div class="mt-3 grid grid-cols-2 gap-2"><input v-model="variantForm.name" class="field col-span-2" placeholder="Nome"><input v-model.number="variantForm.price" class="field" min="0" type="number" placeholder="Preço"><select v-model="variantForm.currency" class="field"><option v-for="currency in currencies" :key="currency">{{ currency }}</option></select><input v-model.number="variantForm.quantity" class="field" min="1" type="number" placeholder="Quantidade"><input v-model.number="variantForm.durationSeconds" class="field" min="0" type="number" placeholder="Duração em segundos"><input v-model.number="variantForm.stock" class="field" min="0" type="number" placeholder="Estoque"><input v-model.number="variantForm.itemLevel" class="field" min="0" type="number" placeholder="Nível"></div><button v-if="canProducts" class="bm-admin-primary mt-3" @click="addVariant">Adicionar variante</button></section>
          </div>
          <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><article v-for="variant in activeProduct.variants" :key="variant.id" class="bm-panel rounded-md p-4"><div class="flex justify-between"><strong>{{ variant.name }}</strong><span>{{ variant.available ? 'Ativa' : 'Inativa' }}</span></div><p class="mt-2 text-xs text-white/45">{{ variant.price }} {{ variant.currency }} · estoque {{ variant.stock ?? '∞' }}</p><button v-if="canProducts && variant.available" class="bm-admin-danger mt-3" @click="disableVariant(variant)">Desativar</button></article></section>
          <section class="bm-panel mt-5 rounded-md p-4"><h3 class="font-display text-xl">Histórico de alterações</h3><div v-for="event in productHistory" :key="event.id" class="mt-3 grid gap-1 border-t border-white/10 pt-3 text-xs sm:grid-cols-[180px_1fr_auto]"><time class="text-white/45">{{ formatDate(event.createdAt) }}</time><strong>{{ event.action }}</strong><span>{{ event.actorUsername || 'sistema' }}</span></div><AdminEmptyState v-if="!productHistory.length" title="Sem alterações registradas" description="As próximas ações administrativas aparecerão aqui." /></section>
        </section>
      </div>

      <div v-if="orderOpen && selectedOrder" class="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
        <section class="mx-auto max-w-5xl border border-white/15 bg-zinc-950 p-5">
          <header class="flex justify-between border-b border-white/10 pb-4"><div><p class="bm-kicker">Pedido e entrega</p><h2 class="mt-2 font-display text-3xl">{{ selectedOrder.product.name }}</h2><p class="mt-1 text-xs text-white/45">{{ selectedOrder.correlationId }}</p></div><button class="icon-button" @click="orderOpen=false"><X class="size-5" /></button></header>
          <div class="mt-5 grid gap-5 lg:grid-cols-2">
            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl">Linha do tempo</h3><div v-for="event in selectedOrder.timeline || []" :key="event.id" class="mt-3 border-t border-white/10 pt-3 text-xs"><div class="flex justify-between gap-3"><strong>{{ event.eventType }}</strong><time class="text-white/40">{{ formatDate(event.occurredAt) }}</time></div><p class="mt-1 text-white/55">{{ event.description }}</p></div><AdminEmptyState v-if="!selectedOrder.timeline?.length" title="Sem eventos" description="A movimentação operacional aparecerá aqui." /></section>
            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl">Observações e evidências</h3><div v-for="note in selectedOrder.notes || []" :key="note.id" class="mt-3 border-t border-white/10 pt-3 text-xs"><strong>{{ note.authorName }}</strong><p class="mt-1 text-white/60">{{ note.content }}</p></div><textarea v-model="orderNote" class="field mt-4 min-h-24" placeholder="Adicionar observação administrativa" /><input v-model="orderEvidence" class="field mt-2" placeholder="URL ou referência da evidência"><button class="bm-admin-primary mt-3" @click="addOrderNote">Registrar observação</button></section>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Activity, BarChart3, Boxes, ClipboardList, Copy, Download, FlaskConical, FolderTree, LayoutDashboard, Pencil, Plus, Save, Truck, X } from 'lucide-vue-next'
import type { StoreCategory, StoreDelivery, StoreOrder, StoreProduct, StoreVariant } from '~/composables/useStoreApi'
import { permissions } from '~/data/security'

const api = useStoreApi()
const contentApi = useAdminContentApi()
const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuth()
const canCategories = computed(() => hasPermission(permissions.adminStoreCategories))
const canProducts = computed(() => hasPermission(permissions.adminStoreProducts))
const canReview = computed(() => hasPermission(permissions.adminStoreReview))
const canPublish = computed(() => hasPermission(permissions.adminStorePublish))
const canOrders = computed(() => hasPermission(permissions.adminStoreOrders))
const canDeliveries = computed(() => hasPermission(permissions.adminStoreDeliveries))
const canRefund = computed(() => hasPermission(permissions.adminStoreRefund))
const canTest = computed(() => hasPermission(permissions.adminStoreTest))
const tabs = [
  { key: 'dashboard', label: 'Visão geral', icon: LayoutDashboard, allowed: true },
  { key: 'products', label: 'Produtos', icon: Boxes, allowed: true },
  { key: 'categories', label: 'Categorias', icon: FolderTree, allowed: true },
  { key: 'orders', label: 'Pedidos', icon: ClipboardList, allowed: canOrders },
  { key: 'deliveries', label: 'Entregas', icon: Truck, allowed: canDeliveries },
  { key: 'reports', label: 'Relatórios', icon: BarChart3, allowed: true },
  { key: 'test', label: 'Teste', icon: FlaskConical, allowed: canTest }
]
const visibleTabs = computed(() => tabs.filter(tab => typeof tab.allowed === 'boolean' ? tab.allowed : tab.allowed.value))
const activeTab = ref(String(route.query.tab || 'dashboard'))
const notice = ref(''), noticeError = ref(false)
const dashboard = ref<Record<string, any>>({})
const products = ref<StoreProduct[]>([]), productTotal = ref(0), productPage = ref(1), productPages = ref(1)
const selectedProducts = ref<string[]>([]), bulkProductAction = ref('')
const categories = ref<StoreCategory[]>([])
const orders = ref<StoreOrder[]>([])
const deliveries = ref<StoreDelivery[]>([])
const reports = ref<Record<string, any>>({})
const productHistory = ref<any[]>([])
const selectedOrder = ref<any>(null), orderOpen = ref(false), orderNote = ref(''), orderEvidence = ref('')
const statuses = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'BLOCKED']
const orderStatuses = ['PREPARED', 'PENDING_PAYMENT', 'PAID', 'DELIVERING', 'COMPLETED', 'MANUAL_REVIEW', 'REFUND_PENDING', 'REFUNDED', 'FAILED', 'CANCELLED']
const deliveryStatuses = ['WAITING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REPROCESSING', 'MANUAL_REVIEW', 'REFUNDED']
const currencies = ['WCOIN', 'GOBLIN_POINT', 'HUNT_POINT']
const targets = ['ACCOUNT', 'CHARACTER', 'INVENTORY', 'VAULT', 'MAIL']
const productQuery = reactive({ search: '', status: '', filter: '' })
const orderQuery = reactive({ search: '', status: String(route.query.status || '') })
const deliveryQuery = reactive({ search: '', status: '' })
const reportDates = reactive({ from: '', to: '' })
const categoryForm = reactive({ id: '', name: '', description: '', sortOrder: 0 })
const testForm = reactive({ productId: '', variantId: '', testAccountId: '', testCharacter: '', simulatePurchase: true, testDelivery: true, rollback: false })
const editorOpen = ref(false), operationsOpen = ref(false), editingId = ref(''), activeProduct = ref<StoreProduct | null>(null)
const editorDirty = ref(false)
const transitionReason = ref(''), scheduleAt = ref('')
const blankForm = () => ({ name: '', slug: '', key: '', category: '', categoryId: '', summary: '', description: '', price: 0, currency: 'WCOIN', stock: null as number | null, images: '', featured: false, deliveryTarget: 'ACCOUNT', accountLimit: null as number | null, periodLimit: null as number | null, periodDays: null as number | null, saleStartsAt: '', saleEndsAt: '', technicalCode: '', sourceOrigin: '', internalNotes: '', workDescription: '', workEvidence: '' })
const form = reactive(blankForm())
const variantForm = reactive({ name: '', price: 0, currency: 'WCOIN', quantity: 1, durationSeconds: null as number | null, stock: null as number | null, itemLevel: null as number | null })
let debounce: ReturnType<typeof setTimeout>

const dashboardMetrics = computed(() => {
  const p = dashboard.value.products || {}, o = dashboard.value.operations || {}
  return [['Ativos', p.active], ['Inativos', p.inactive], ['Em revisão', p.review], ['Sem imagem', p.withoutImage], ['Sem preço', p.withoutPrice], ['Não identificados', p.unidentified], ['Pedidos pendentes', o.pendingOrders], ['Entregas falhas', o.failedDeliveries], ['Estornos pendentes', o.pendingRefunds], ['Minhas tarefas', o.assignedTasks]].map(([label, value]) => ({ label, value: value || 0 }))
})
const reportMetrics = computed(() => {
  const values = [['Pedidos', reports.value.orders], ['Entregas', reports.value.deliveries], ['Falhas', reports.value.failures], ['Produtos', reports.value.products]]
  if (reports.value.financial) values.push(['Receita', reports.value.financial.revenue], ['Ticket médio', reports.value.financial.averageTicket], ['Vendas', reports.value.financial.sales], ['Estornos', reports.value.financial.refunds])
  return values.map(([label, value]) => ({ label, value: value || 0 }))
})
const allProductsSelected = computed(() => products.value.length > 0 && products.value.every(product => selectedProducts.value.includes(product.id)))
const setNotice = (message: string, error = false) => { notice.value = message; noticeError.value = error }
const loadDashboard = async () => { dashboard.value = await api.dashboard() }
const loadCategories = async () => { categories.value = await api.categories() }
const productFilters = () => { const filters: Record<string, unknown> = { search: productQuery.search, status: productQuery.status }; if (productQuery.filter) filters[productQuery.filter] = true; return filters }
const loadProducts = async () => { const result = await api.products({ ...productFilters(), page: productPage.value, pageSize: 30 }); products.value = result.data; productTotal.value = result.total; productPages.value = result.totalPages; selectedProducts.value = selectedProducts.value.filter(id => result.data.some(product => product.id === id)) }
const loadOrders = async () => { orders.value = (await api.orders({ ...orderQuery, pageSize: 50 })).data }
const loadDeliveries = async () => { deliveries.value = (await api.deliveries({ ...deliveryQuery, pageSize: 50 })).data }
const loadReports = async () => { reports.value = await api.reports(reportDates) }
const loadTab = async () => { try { if (activeTab.value === 'dashboard') await loadDashboard(); if (activeTab.value === 'products') await Promise.all([loadProducts(), loadCategories()]); if (activeTab.value === 'categories') await loadCategories(); if (activeTab.value === 'orders') await loadOrders(); if (activeTab.value === 'deliveries') await loadDeliveries(); if (activeTab.value === 'reports') await loadReports() } catch { setNotice('Não foi possível carregar esta área da loja.', true) } }
const selectTab = async (key: string) => {
  activeTab.value = key
  await router.replace({ query: { ...route.query, tab: key } })
  await loadTab()
}

watch(
  [() => route.query.tab, () => route.query.status],
  async ([tab, status]) => {
    const next = String(tab || 'dashboard')
    orderQuery.status = String(status || '')
    if (activeTab.value === next) {
      if (next === 'orders') await loadOrders()
      return
    }
    activeTab.value = next
    await loadTab()
  }
)
const debouncedProducts = () => { clearTimeout(debounce); debounce = setTimeout(loadProducts, 300) }
const debouncedOrders = () => { clearTimeout(debounce); debounce = setTimeout(loadOrders, 300) }
const debouncedDeliveries = () => { clearTimeout(debounce); debounce = setTimeout(loadDeliveries, 300) }

const openCreate = async () => { await loadCategories(); editingId.value = ''; Object.assign(form, blankForm()); editorOpen.value = true }
const openEdit = async (product: StoreProduct) => { await loadCategories(); editingId.value = product.id; Object.assign(form, { ...blankForm(), ...product, categoryId: product.categoryId || '', images: (product.images || []).join('\n'), saleStartsAt: product.saleStartsAt?.slice(0, 16) || '', saleEndsAt: product.saleEndsAt?.slice(0, 16) || '' }); editorOpen.value = true }
const closeEditor = () => { if (editorDirty.value && !confirm('Descartar as alterações não salvas?')) return; editorDirty.value = false; editorOpen.value = false }
const productPayload = () => ({ ...form, categoryId: form.categoryId || null, images: form.images.split('\n').map(v => v.trim()).filter(Boolean), saleStartsAt: form.saleStartsAt || null, saleEndsAt: form.saleEndsAt || null, workEvidence: form.workEvidence || undefined })
const saveProduct = async () => { try { editingId.value ? await api.updateProduct(editingId.value, productPayload()) : await api.createProduct(productPayload()); editorDirty.value = false; editorOpen.value = false; setNotice('Produto salvo como rascunho e alteração auditada.'); await Promise.all([loadProducts(), loadDashboard()]) } catch (error: any) { setNotice(error?.data?.message || 'Falha ao salvar produto.', true) } }
const duplicate = async (product: StoreProduct) => { await api.duplicateProduct(product.id); setNotice('Produto duplicado como rascunho.'); await loadProducts() }
const openOperations = async (product: StoreProduct) => { const [details, history] = await Promise.all([api.product(product.id), api.productHistory(product.id)]); activeProduct.value = details; productHistory.value = history; operationsOpen.value = true }
const transition = async (action: string) => { if (!activeProduct.value) return; try { activeProduct.value = await api.transitionProduct(activeProduct.value.id, { action, reason: transitionReason.value, scheduledPublishAt: scheduleAt.value || undefined }); setNotice('Workflow atualizado e auditado.'); await Promise.all([loadProducts(), loadDashboard()]) } catch (error: any) { setNotice(error?.data?.message || 'Falha no workflow.', true) } }
const addVariant = async () => { if (!activeProduct.value || !variantForm.name.trim()) return; await api.createVariant(activeProduct.value.id, variantForm); Object.assign(variantForm, { name: '', price: 0, currency: 'WCOIN', quantity: 1, durationSeconds: null, stock: null, itemLevel: null }); activeProduct.value = await api.product(activeProduct.value.id); setNotice('Variante adicionada.') }
const disableVariant = async (variant: StoreVariant) => { await api.deleteVariant(variant.id); if (activeProduct.value) activeProduct.value = await api.product(activeProduct.value.id) }
const importCatalog = async (dryRun: boolean) => { try { const result = await api.importCatalog({ limit: 1000, dryRun }); setNotice(`Importação concluída: ${result.created || 0} criados, ${result.blocked || 0} bloqueados e ${result.skipped || 0} já existentes.`); await Promise.all([loadProducts(), loadDashboard()]) } catch (error: any) { setNotice(error?.data?.message || 'Falha ao importar catálogo.', true) } }
const toggleAllProducts = () => { selectedProducts.value = allProductsSelected.value ? [] : products.value.map(product => product.id) }
const runBulkProductAction = async () => { if (!bulkProductAction.value || !selectedProducts.value.length) return; const needsReason = ['archive', 'delete'].includes(bulkProductAction.value); const reason = needsReason ? prompt('Informe a justificativa da ação em lote:') || '' : ''; if (needsReason && !reason) return; try { const result = await api.bulkProducts({ ids: selectedProducts.value, action: bulkProductAction.value, reason }); setNotice(`Ação em lote: ${result.succeeded} concluídos e ${result.failed} com falha.`); selectedProducts.value = []; bulkProductAction.value = ''; await Promise.all([loadProducts(), loadDashboard()]) } catch (error: any) { setNotice(error?.data?.message || 'Falha na ação em lote.', true) } }
const exportProducts = async () => { try { const result = await api.exportProducts(productFilters()); const blob = new Blob([`\uFEFF${result.content}`], { type: result.contentType }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = result.filename; link.click(); URL.revokeObjectURL(url); setNotice('Catálogo exportado e ação auditada.') } catch (error: any) { setNotice(error?.data?.message || 'Falha ao exportar o catálogo.', true) } }
const saveCategory = async () => { if (!categoryForm.name.trim()) return; categoryForm.id ? await api.updateCategory(categoryForm.id, categoryForm) : await api.createCategory(categoryForm); Object.assign(categoryForm, { id: '', name: '', description: '', sortOrder: 0 }); setNotice('Categoria salva.'); await loadCategories() }
const editCategory = (category: StoreCategory) => Object.assign(categoryForm, { id: category.id, name: category.name, description: category.description || '', sortOrder: category.sortOrder })
const categoryAction = async (category: StoreCategory, action: 'archive' | 'restore' | 'delete') => { await api.categoryAction(category.id, action, 'Manutenção administrativa da categoria.'); await loadCategories() }
const orderAction = async (order: StoreOrder, action: string) => { const reason = ['manual-review', 'cancel', 'refund'].includes(action) ? prompt('Informe o motivo:') || '' : ''; if (['cancel', 'refund'].includes(action) && !reason) return; try { await api.orderAction(order.id, { action, reason }); setNotice('Pedido atualizado e registrado na linha do tempo.'); await Promise.all([loadOrders(), loadDashboard()]) } catch (error: any) { setNotice(error?.data?.message || 'Falha ao atualizar pedido.', true) } }
const openOrder = async (order: StoreOrder) => { selectedOrder.value = await api.order(order.id); orderNote.value = ''; orderEvidence.value = ''; orderOpen.value = true }
const addOrderNote = async () => { if (!selectedOrder.value || !orderNote.value.trim()) return; await api.addOrderNote(selectedOrder.value.id, { content: orderNote.value, evidence: orderEvidence.value || undefined }); selectedOrder.value = await api.order(selectedOrder.value.id); orderNote.value = ''; orderEvidence.value = ''; setNotice('Observação registrada e auditada.') }
const deliveryAction = async (delivery: StoreDelivery, action: string) => { const error = action === 'fail' ? prompt('Descreva a falha:') || '' : ''; if (action === 'fail' && !error) return; try { await api.deliveryAction(delivery.id, { action, error }); setNotice('Entrega atualizada.'); await Promise.all([loadDeliveries(), loadDashboard()]) } catch (reason: any) { setNotice(reason?.data?.message || 'Falha ao atualizar entrega.', true) } }
const runTest = async () => { try { await api.testProduct({ ...testForm, variantId: testForm.variantId || undefined, testCharacter: testForm.testCharacter || undefined }); setNotice('Teste concluído e relatório auditado.') } catch (error: any) { setNotice(error?.data?.message || 'Teste bloqueado ou falhou.', true) } }
const uploadProductImage = async (event: Event) => { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file) return; if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setNotice('Selecione uma imagem PNG, JPEG ou WebP de até 5 MB.', true); return } try { const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) }); const uploaded = await contentApi.uploadImage({ name: file.name.replace(/\.[^.]+$/, ''), dataUrl }); form.images = [form.images.trim(), uploaded.url].filter(Boolean).join('\n'); setNotice('Imagem enviada e adicionada ao produto.') } catch { setNotice('Não foi possível enviar a imagem.', true) } }
const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR')

watch(form, () => { if (editorOpen.value) editorDirty.value = true }, { deep: true })
const warnUnsaved = (event: BeforeUnloadEvent) => { if (!editorDirty.value) return; event.preventDefault(); event.returnValue = '' }
onMounted(() => window.addEventListener('beforeunload', warnUnsaved))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnsaved))
onBeforeRouteLeave(() => !editorDirty.value || confirm('Sair sem salvar as alterações do produto?'))
onMounted(async () => {
  if (!visibleTabs.value.some((tab) => tab.key === activeTab.value)) {
    activeTab.value = 'dashboard'
    await router.replace({ query: { ...route.query, tab: 'dashboard' } })
  }
  await loadTab()
})
</script>

<style scoped>
.store-tab { display:flex; align-items:center; gap:.45rem; min-height:2.4rem; flex:none; border:1px solid transparent; border-radius:.375rem; padding:.55rem .8rem; font-size:.7rem; font-weight:900; color:rgba(255,255,255,.48); }
.store-tab:hover,.store-tab.active { border-color:rgba(255,255,255,.13); background:rgba(255,255,255,.08); color:white; }
.field { min-height:2.55rem; width:100%; border:1px solid rgba(255,255,255,.12); border-radius:.375rem; background:rgba(255,255,255,.055); padding:.62rem .75rem; color:white; font-size:.75rem; font-weight:700; outline:none; }
.label { display:grid; gap:.35rem; color:rgba(255,255,255,.48); font-size:.62rem; font-weight:900; text-transform:uppercase; letter-spacing:.12em; }
.check { display:flex; align-items:center; gap:.5rem; font-size:.72rem; font-weight:800; color:rgba(255,255,255,.62); }
.status-pill { display:inline-flex; border:1px solid rgba(255,255,255,.1); border-radius:.2rem; background:rgba(255,255,255,.06); padding:.25rem .45rem; font-size:.58rem; font-weight:900; letter-spacing:.1em; }
.metric-label { font-size:.6rem; font-weight:900; text-transform:uppercase; letter-spacing:.16em; color:rgba(255,255,255,.42); }
.metric-value { display:block; margin-top:.5rem; font-family:var(--font-display); font-size:1.7rem; }
thead { color:rgba(255,255,255,.38); font-size:.6rem; text-transform:uppercase; letter-spacing:.12em; }
</style>
