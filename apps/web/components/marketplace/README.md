# Marketplace components

Reusable public marketplace presentation components.

- `MarketplaceFilters.vue`: search, category, currency, sorting and display mode.
- `MarketplaceItemCard.vue`: compact card/list representation of one listing.
- `MarketplaceItemDetails.vue`: item inspection and purchase confirmation modal.
- `MarketplaceAdminManager.vue`: shared admin workspace for listings, escrow,
  transactions, reports, tasks, economy and analytics.
- `Metric.vue`, `ListToolbar.vue`, `ActionButton.vue`, `NumberField.vue` and
  `EmptyState.vue`: compact reusable administrative primitives.
- `AdminPagination.vue`: shared paginated-list footer.

Business rules, escrow and item transfer remain in the API. These components only render state and emit user intent.
