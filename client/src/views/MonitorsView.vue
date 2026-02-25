<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <header>
      <h1 class="text-2xl font-bold text-zinc-100 tracking-tight">Monitors</h1>
      <p class="text-zinc-500 text-sm mt-1">Uptime checks and SSL expiry</p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="m in monitors"
        :key="m.id"
        class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-colors"
        :class="isUp(m) ? 'border-emerald-800/50' : 'border-red-800/50'"
      >
        <div class="p-4">
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-zinc-200 font-medium truncate flex-1" :title="m.url">{{ m.url }}</span>
            <span
              class="shrink-0 w-3 h-3 rounded-full mt-1"
              :class="isUp(m) ? 'bg-emerald-500' : 'bg-red-500'"
              :title="isUp(m) ? 'Up' : 'Down'"
            />
          </div>
          <div class="text-xs text-zinc-500">
            {{ m.last_status_code != null ? `HTTP ${m.last_status_code}` : '—' }}
            <span v-if="lastLatency(m) != null" class="ml-2">{{ lastLatency(m) }} ms</span>
          </div>
          <div class="h-12 mt-2">
            <canvas :ref="(el) => setChartRef(m.id, el)"></canvas>
          </div>
        </div>
      </div>
    </div>
    <p v-if="!monitors.length" class="text-zinc-500 text-sm">No monitors yet. Add one below.</p>

    <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 class="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
        <PlusCircleIcon class="h-4 w-4" />
        Add monitor
      </h2>
      <form @submit.prevent="addMonitor" class="flex flex-col gap-3">
        <div>
          <label class="block text-xs text-zinc-500 mb-1">Application</label>
          <select
            v-model="newMonitorAppId"
            class="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Select app</option>
            <option v-for="a in applications" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div class="flex gap-3">
          <input
            v-model="newMonitorUrl"
            placeholder="https://example.com"
            type="url"
            class="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            type="submit"
            :disabled="!newMonitorAppId || !newMonitorUrl.trim()"
            class="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { PlusCircleIcon } from '@heroicons/vue/24/outline';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { apps, monitors as monitorsApi, pingHistory } from '../api';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const applications = ref([]);
const monitors = ref([]);
const pingHistoryByMonitor = ref({});
const chartRefs = ref({});
const chartInstances = ref({});
const newMonitorAppId = ref('');
const newMonitorUrl = ref('');

function setChartRef(id, el) {
  if (el) chartRefs.value[id] = el;
}

function isUp(m) {
  const history = pingHistoryByMonitor.value[m.id] || [];
  const last = history[history.length - 1];
  return last ? last.is_up !== false : m.last_status_code >= 200 && m.last_status_code < 300;
}

function lastLatency(m) {
  const history = pingHistoryByMonitor.value[m.id] || [];
  const last = history[history.length - 1];
  return last?.response_time_ms ?? null;
}

async function fetchApps() {
  const { data } = await apps.list();
  applications.value = data || [];
}

async function fetchMonitors() {
  const { data } = await monitorsApi.list();
  monitors.value = data || [];
}

async function fetchPingHistory() {
  const byMonitor = {};
  for (const m of monitors.value) {
    const { data } = await pingHistory.list(m.id, { limit: 48 });
    byMonitor[m.id] = (data || []).reverse();
  }
  pingHistoryByMonitor.value = byMonitor;
}

function addMonitor() {
  if (!newMonitorAppId.value || !newMonitorUrl.value.trim()) return;
  monitorsApi.create({ app_id: newMonitorAppId.value, url: newMonitorUrl.value.trim() }).then(() => {
    newMonitorUrl.value = '';
    fetchMonitors();
    fetchPingHistory();
  });
}

function renderChart(id, history) {
  const el = chartRefs.value[id];
  if (!el) return;
  if (chartInstances.value[id]) chartInstances.value[id].destroy();
  const points = history.slice(-48).map((p) => (p.is_up !== false ? p.response_time_ms : null));
  chartInstances.value[id] = new Chart(el, {
    type: 'line',
    data: {
      labels: points.map(() => ''),
      datasets: [{
        data: points,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: false },
        y: {
          min: 0,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'rgb(161, 161, 170)', maxTicksLimit: 4 },
        },
      },
      plugins: { tooltip: { callbacks: { label: (ctx) => (ctx.raw != null ? `${ctx.raw} ms` : 'down') } } },
    },
  });
}

watch(pingHistoryByMonitor, (byMonitor) => {
  monitors.value.forEach((m) => {
    const history = byMonitor[m.id] || [];
    renderChart(m.id, history);
  });
}, { deep: true });

onMounted(async () => {
  await fetchApps();
  await fetchMonitors();
  await fetchPingHistory();
  monitors.value.forEach((m) => {
    renderChart(m.id, pingHistoryByMonitor.value[m.id] || []);
  });
});
</script>
