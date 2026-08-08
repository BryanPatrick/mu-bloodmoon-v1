<script setup lang="ts">
const route = useRoute()
await navigateTo(`/comunidade/${String(route.params.username)}`, { replace: true })
</script>
