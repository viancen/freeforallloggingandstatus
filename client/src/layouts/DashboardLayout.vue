<template>
  <div class="flex min-h-screen bg-zinc-950">
    <!-- Sidebar -->
    <aside class="w-56 shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
      <div class="p-4 border-b border-sidebar-border">
        <router-link to="/" class="flex items-center gap-2 text-zinc-100 font-semibold tracking-tight">
          <CubeIcon class="h-7 w-7 text-emerald-500" />
          <span>FreeForAll</span>
        </router-link>
        <p class="text-xs text-zinc-500 mt-0.5">Logging & Status</p>
      </div>
      <nav class="flex-1 p-3 space-y-0.5">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="isActive(item.path) ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:bg-surface-hover hover:text-zinc-200'"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" />
          {{ item.label }}
        </router-link>
      </nav>
      <div class="p-3 border-t border-sidebar-border">
        <button
          @click="logout"
          class="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-surface-hover hover:text-zinc-200 transition-colors"
        >
          <ArrowRightOnRectangleIcon class="h-5 w-5 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';
import {
  HomeIcon,
  DocumentTextIcon,
  CubeIcon,
  SignalIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/vue/24/outline';

const router = useRouter();
const route = useRoute();

const navItems = [
  { path: '/', label: 'Overview', icon: HomeIcon },
  { path: '/logs', label: 'Logs', icon: DocumentTextIcon },
  { path: '/applications', label: 'Applications', icon: CubeIcon },
  { path: '/monitors', label: 'Monitors', icon: SignalIcon },
];

function isActive(path) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

function logout() {
  localStorage.removeItem('ffa_token');
  router.push('/login');
}
</script>
