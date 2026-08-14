<template>
  <ManagementShell>
    <PlayerDashboard v-if="user?.role === 'player'" />
    <GmDashboard v-else-if="user?.role === 'gm'" />
    <AdminDashboard v-else-if="user?.role === 'admin'" />
    <SuperAdminDashboard v-else-if="user?.role === 'super-admin'" />
  </ManagementShell>
</template>

<script setup lang="ts">
import AdminDashboard from '~/components/dashboard/Admin.vue'
import GmDashboard from '~/components/dashboard/Gm.vue'
import PlayerDashboard from '~/components/dashboard/Player.vue'
import SuperAdminDashboard from '~/components/dashboard/SuperAdmin.vue'

const { loadSession, user } = useAuth()

loadSession()
useSeoMeta({ title: 'Painel' })
</script>
