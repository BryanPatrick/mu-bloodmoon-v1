<template>
  <ManagementShell>
    <GmDashboard v-if="user?.role === 'gm'" />
  </ManagementShell>
</template>

<script setup lang="ts">
import GmDashboard from '~/components/dashboard/Gm.vue'

const { loadSession, user } = useAuth()

loadSession()
useSeoMeta({ title: 'Painel GM' })
</script>
