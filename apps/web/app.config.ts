// Wires @nuxt/ui's theme tokens to the Blood Moon design system instead of
// its default neutral-gray palette. See docs/design-system.md: "Mesmo
// usando Nuxt UI, a aparencia deve ser customizada para seguir as
// classes/tokens Blood Moon." The `--ui-*` semantic tokens themselves are
// overridden in main.css so every Nuxt UI component (UModal, UButton,
// UInput, USelect, UTextarea, UTable, UTabs, UDropdownMenu...) reads the
// same surface/text/border values as the rest of the site automatically.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blood',
      neutral: 'stone'
    }
  }
})
