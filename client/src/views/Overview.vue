<template>
  <div class="p-6 max-w-7xl mx-auto space-y-8">
    <header>
      <h1 class="text-2xl font-bold text-zinc-100 tracking-tight">Overview</h1>
      <p class="text-zinc-500 text-sm mt-1">Service health and recent activity</p>
    </header>

    <section>
      <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <SignalIcon class="h-4 w-4" />
        Service health
      </h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HealthCard
          v-for="m in monitors"
          :key="m.id"
          :monitor="m"
          :history="pingHistoryByMonitor[m.id] || []"
        />
      </div>
      <p v-if="!monitors.length" class="text-zinc-500 text-sm">No monitors yet. Add one from <router-link to="/monitors" class="text-emerald-400 hover:underline">Monitors</router-link>.</p>
    </section>

    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <DocumentTextIcon class="h-4 w-4" />
          Recent logs
        </h2>
        <router-link
          to="/logs"
          class="text-sm font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
        >
          View all logs
          <ArrowTopRightOnSquareIcon class="h-4 w-4" />
        </router-link>
      </div>
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-zinc-800/80 text-zinc-500 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">Time</th>
              <th class="px-4 py-3 font-medium">App</th>
              <th class="px-4 py-3 font-medium">Level</th>
              <th class="px-4 py-3 font-medium">Message</th>
              <th class="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in recentLogs"
              :key="log.id"
              class="border-t border-zinc-800 hover:bg-zinc-800/40 transition-colors"
            >
              <td class="px-4 py-2.5 text-zinc-500 whitespace-nowrap tabular-nums">{{ formatDate(log.created_at) }}</td>
              <td class="px-4 py-2.5 text-zinc-300">{{ log.app_name }}</td>
              <td class="px-4 py-2.5">
                <span :class="levelBadgeClass(log.level)" class="inline-flex px-2 py-0.5 rounded text-xs font-medium">
                  {{ log.level }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-zinc-400 truncate max-w-xs">{{ log.message }}</td>
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
        <p v-if="!recentLogs.length && !logsLoading" class="px-4 py-8 text-center text-zinc-500 text-sm">No logs yet.</p>
        <p v-if="logsLoading" class="px-4 py-8 text-center text-zinc-500 text-sm">Loading…</p>
      </div>
    </section>

    <LogDetailModal v-if="selectedLog" :log="selectedLog" @close="selectedLog = null" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { DocumentTextIcon, SignalIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline';
import { monitors as monitorsApi, logs as logsApi, pingHistory } from '../api';
import HealthCard from '../components/HealthCard.vue';
import LogDetailModal from '../components/LogDetailModal.vue';

const monitors = ref([]);
const recentLogs = ref([]);
const pingHistoryByMonitor = ref({});
const selectedLog = ref(null);
const logsLoading = ref(false);

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

async function fetchMonitors() {
  const { data } = await monitorsApi.list();
  monitors.value = data;
}

async function fetchRecentLogs() {
  logsLoading.value = true;
  try {
    const { data } = await logsApi.list({ limit: 10 });
    recentLogs.value = data || [];
  } finally {
    logsLoading.value = false;
  }
}

async function fetchPingHistory() {
  const byMonitor = {};
  for (const m of monitors.value) {
    const { data } = await pingHistory.list(m.id, { limit: 24 * 60 });
    byMonitor[m.id] = (data || []).reverse();
  }
  pingHistoryByMonitor.value = byMonitor;
}

let refreshInterval;
onMounted(() => {
  fetchMonitors();
  fetchRecentLogs();
  fetchPingHistory();
  refreshInterval = setInterval(fetchPingHistory, 60 * 1000);
});
onUnmounted(() => clearInterval(refreshInterval));
</script>
