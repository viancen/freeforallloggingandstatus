<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <header>
      <h1 class="text-2xl font-bold text-zinc-100 tracking-tight">Applications</h1>
      <p class="text-zinc-500 text-sm mt-1">Manage apps and copy API keys for log ingestion</p>
    </header>

    <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div class="px-4 py-3 border-b border-zinc-800 bg-zinc-800/50 flex items-center justify-between">
        <span class="text-sm font-medium text-zinc-300">Your applications</span>
      </div>
      <div class="divide-y divide-zinc-800">
        <div
          v-for="a in applications"
          :key="a.id"
          class="px-4 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <CubeIcon class="h-5 w-5 text-emerald-400" />
            </div>
            <div class="min-w-0">
              <p class="font-medium text-zinc-200 truncate">{{ a.name }}</p>
              <code class="text-xs text-zinc-500 font-mono truncate block max-w-[240px]" :title="a.api_key">{{ a.api_key }}</code>
            </div>
          </div>
          <button
            @click="copyKey(a.api_key)"
            class="rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm px-3 py-1.5 font-medium transition-colors"
          >
            Copy key
          </button>
        </div>
      </div>
      <p v-if="!applications.length" class="px-4 py-8 text-center text-zinc-500 text-sm">No applications yet. Add one below.</p>
    </div>

    <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 class="text-sm font-semibold text-zinc-400 mb-3">Add application</h2>
      <form @submit.prevent="addApp" class="flex gap-3">
        <input
          v-model="newAppName"
          placeholder="App name"
          class="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <button
          type="submit"
          :disabled="!newAppName.trim()"
          class="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
        >
          Add app
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { CubeIcon } from '@heroicons/vue/24/outline';
import { apps } from '../api';

const applications = ref([]);
const newAppName = ref('');

async function fetchApps() {
  const { data } = await apps.list();
  applications.value = data || [];
}

function addApp() {
  if (!newAppName.value.trim()) return;
  apps.create(newAppName.value.trim()).then(() => {
    newAppName.value = '';
    fetchApps();
  });
}

function copyKey(key) {
  navigator.clipboard.writeText(key).catch(() => {});
}

onMounted(fetchApps);
</script>