<template>
  <div class="p-6 max-w-[1600px] mx-auto space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-zinc-100 tracking-tight">Logs</h1>
        <p class="text-zinc-500 text-sm mt-1">Search, filter, and inspect all ingested logs</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-2 text-sm text-zinc-400">
          <input v-model="autoRefresh" type="checkbox" class="rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500" />
          Auto-refresh (30s)
        </label>
        <button
          @click="fetchLogs"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </header>

    <!-- Filters -->
    <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <FunnelIcon class="h-3.5 w-3.5" />
        Filters
      </h2>
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-xs text-zinc-500 mb-1">App</label>
          <select
            v-model="filters.app_id"
            class="rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 min-w-[140px] focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All apps</option>
            <option v-for="a in applications" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-zinc-500 mb-1">Level</label>
          <select
            v-model="filters.level"
            class="rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 min-w-[100px] focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All levels</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-zinc-500 mb-1">From</label>
          <input
            v-model="filters.from"
            type="datetime-local"
            class="rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-xs text-zinc-500 mb-1">To</label>
          <input
            v-model="filters.to"
            type="datetime-local"
            class="rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <button
          @click="fetchLogs"
          class="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>

    <!-- Log table -->
    <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div class="px-4 py-3 border-b border-zinc-800 bg-zinc-800/50 flex items-center justify-between">
        <span class="text-sm text-zinc-400">
          {{ logs.length }} log{{ logs.length === 1 ? '' : 's' }} (max 500)
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-zinc-800/80 text-zinc-500 text-left">
            <tr>
              <th class="px-4 py-3 font-medium whitespace-nowrap">Time</th>
              <th class="px-4 py-3 font-medium whitespace-nowrap">App</th>
              <th class="px-4 py-3 font-medium whitespace-nowrap">Level</th>
              <th class="px-4 py-3 font-medium whitespace-nowrap">Environment</th>
              <th class="px-4 py-3 font-medium whitespace-nowrap">Hostname</th>
              <th class="px-4 py-3 font-medium min-w-[200px]">Message</th>
              <th class="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
              class="border-t border-zinc-800 hover:bg-zinc-800/40 transition-colors"
            >
              <td class="px-4 py-2.5 text-zinc-500 whitespace-nowrap tabular-nums">{{ formatDate(log.created_at) }}</td>
              <td class="px-4 py-2.5 text-zinc-300 whitespace-nowrap">{{ log.app_name }}</td>
              <td class="px-4 py-2.5">
                <span :class="levelBadgeClass(log.level)" class="inline-flex px-2 py-0.5 rounded text-xs font-medium uppercase">
                  {{ log.level }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-zinc-500 whitespace-nowrap">{{ log.environment || '—' }}</td>
              <td class="px-4 py-2.5 text-zinc-500 whitespace-nowrap font-mono text-xs">{{ log.hostname || '—' }}</td>
              <td class="px-4 py-2.5 text-zinc-400 max-w-md truncate" :title="log.message">{{ log.message }}</td>
              <td class="px-4 py-2.5">
                <button
                  @click="openLogDetail(log)"
                  class="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                >
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!logs.length && !loading" class="px-4 py-12 text-center text-zinc-500 text-sm">No logs match your filters. Try adjusting or refresh.</p>
      <p v-if="loading" class="px-4 py-12 text-center text-zinc-500 text-sm">Loading logs…</p>
    </div>

    <LogDetailModal v-if="selectedLog" :log="selectedLog" @close="selectedLog = null" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { ArrowPathIcon, FunnelIcon } from '@heroicons/vue/24/outline';
import { apps, logs as logsApi } from '../api';
import LogDetailModal from '../components/LogDetailModal.vue';

const applications = ref([]);
const logs = ref([]);
const selectedLog = ref(null);
const loading = ref(false);
const autoRefresh = ref(false);
const filters = reactive({
  app_id: '',
  level: '',
  from: '',
  to: '',
});

function levelBadgeClass(level) {
  const m = {
    error: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
    info: 'bg-zinc-500/20 text-zinc-300',
    debug: 'bg-zinc-600/20 text-zinc-500',
  };
  return m[level] || 'bg-zinc-500/20 text-zinc-400';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function openLogDetail(log) {
  selectedLog.value = log;
}

async function fetchApps() {
  const { data } = await apps.list();
  applications.value = data || [];
}

async function fetchLogs() {
  loading.value = true;
  try {
    const params = { limit: 500 };
    if (filters.app_id) params.app_id = filters.app_id;
    if (filters.level) params.level = filters.level;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    const { data } = await logsApi.list(params);
    logs.value = data || [];
  } finally {
    loading.value = false;
  }
}

let interval;
watch(autoRefresh, (on) => {
  if (interval) clearInterval(interval);
  if (on) interval = setInterval(fetchLogs, 30 * 1000);
});

onMounted(() => {
  fetchApps();
  fetchLogs();
});
onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>
