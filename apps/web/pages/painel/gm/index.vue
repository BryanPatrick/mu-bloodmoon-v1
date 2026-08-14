<template>
  <ManagementShell>
    <GmDashboard v-if="canViewGmPanel" />
  </ManagementShell>
</template>

<script setup lang="ts">
import GmDashboard from '~/components/dashboard/Gm.vue'

const { loadSession, user } = useAuth()

loadSession()
useSeoMeta({ title: 'Painel GM' })

// The backend GM controller (gm.controller.ts) allows GM, ADMIN and
// SUPER_ADMIN, matching the PLAYER < GM < ADMIN < SUPER_ADMIN hierarchy --
// higher roles can also see the operational panel for oversight.
const canViewGmPanel = computed(() => user.value?.role === 'gm' || user.value?.role === 'admin' || user.value?.role === 'super-admin')
</script>
