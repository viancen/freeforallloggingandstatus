<template>
  <div class="min-h-screen bg-zinc-900">
    <header class="border-b border-zinc-800 bg-zinc-800/50 px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-semibold text-zinc-100">FreeForAll — Logging & Status</h1>
      <button
        @click="logout"
        class="text-sm text-zinc-400 hover:text-zinc-200"
      >
        Log out
      </button>
    </header>
    <main class="p-4 max-w-7xl mx-auto space-y-6">
      <section>
        <h2 class="text-md font-medium text-zinc-300 mb-3">Service health</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <HealthCard
            v-for="m in monitors"
            :key="m.id"
            :monitor="m"
            :history="pingHistoryByMonitor[m.id] || []"
          />
        </div>
      </section>
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-md font-medium text-zinc-300">Log explorer</h2>
          <div class="flex gap-2 flex-wrap">
            <select
              v-model="filters.app_id"
              class="rounded bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm px-2 py-1"
            >
              <option value="">All apps</option>
              <option v-for="a in applications" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
            <select
              v-model="filters.level"
              class="rounded bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm px-2 py-1"
            >
              <option value="">All levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <input
              v-model="filters.from"
              type="datetime-local"
              class="rounded bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm px-2 py-1"
            />
            <input
              v-model="filters.to"
              type="datetime-local"
              class="rounded bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm px-2 py-1"
            />
            <button
              @click="fetchLogs"
              class="rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1"
            >
              Refresh
            </button>
          </div>
        </div>
        <div class="rounded-lg border border-zinc-700 bg-zinc-800/50 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-zinc-800 text-zinc-400 text-left">
              <tr>
                <th class="px-4 py-2">Time</th>
                <th class="px-4 py-2">App</th>
                <th class="px-4 py-2">Level</th>
                <th class="px-4 py-2">Message</th>
                <th class="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in logs"
                :key="log.id"
                class="border-t border-zinc-700 hover:bg-zinc-700/30"
              >
                <td class="px-4 py-2 text-zinc-400 whitespace-nowrap">{{ formatDate(log.created_at) }}</td>
                <td class="px-4 py-2">{{ log.app_name }}</td>
                <td class="px-4 py-2">
                  <span :class="levelClass(log.level)">{{ log.level }}</span>
                </td>
                <td class="px-4 py-2 truncate max-w-xs">{{ log.message }}</td>
                <td class="px-4 py-2">
                  <button
                    @click="openLogDetail(log)"
                    class="text-emerald-400 hover:text-emerald-300 text-xs"
                  >
                    Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="flex flex-wrap gap-4 items-start">
        <div class="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 flex-1 min-w-[280px]">
          <h2 class="text-md font-medium text-zinc-300 mb-3">Applications</h2>
          <div class="space-y-2">
            <div
              v-for="a in applications"
              :key="a.id"
              class="flex items-center justify-between py-2 border-b border-zinc-700 last:border-0"
            >
              <span class="text-zinc-200">{{ a.name }}</span>
              <code class="text-xs text-zinc-500 truncate max-w-[140px]" :title="a.api_key">{{ a.api_key }}</code>
            </div>
          </div>
          <form @submit.prevent="addApp" class="mt-3 flex gap-2">
            <input
              v-model="newAppName"
              placeholder="App name"
              class="flex-1 rounded bg-zinc-700 border border-zinc-600 text-zinc-100 px-2 py-1 text-sm"
            />
            <button type="submit" class="rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1">
              Add app
            </button>
          </form>
        </div>
        <div class="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 flex-1 min-w-[280px]">
          <h2 class="text-md font-medium text-zinc-300 mb-3">Monitors</h2>
          <div class="space-y-2">
            <div
              v-for="m in monitors"
              :key="m.id"
              class="flex items-center justify-between py-2 border-b border-zinc-700 last:border-0"
            >
              <span class="text-zinc-200 truncate max-w-[180px]" :title="m.url">{{ m.url }}</span>
              <span :class="m.last_status_code >= 200 && m.last_status_code < 300 ? 'text-emerald-400' : 'text-red-400'">
                {{ m.last_status_code ?? '—' }}
              </span>
            </div>
          </div>
          <form @submit.prevent="addMonitor" class="mt-3 flex flex-col gap-2">
            <select
              v-model="newMonitorAppId"
              class="rounded bg-zinc-700 border border-zinc-600 text-zinc-100 px-2 py-1 text-sm"
            >
              <option value="">Select app</option>
              <option v-for="a in applications" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
            <div class="flex gap-2">
              <input
                v-model="newMonitorUrl"
                placeholder="https://example.com"
                type="url"
                class="flex-1 rounded bg-zinc-700 border border-zinc-600 text-zinc-100 px-2 py-1 text-sm"
              />
              <button type="submit" class="rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1">
                Add
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
    <LogDetailModal
      v-if="selectedLog"
      :log="selectedLog"
      @close="selectedLog = null"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { apps, monitors as monitorsApi, logs as logsApi, pingHistory } from '../api';
import HealthCard from '../components/HealthCard.vue';
import LogDetailModal from '../components/LogDetailModal.vue';

const router = useRouter();
const applications = ref([]);
const monitors = ref([]);
const logs = ref([]);
const pingHistoryByMonitor = ref({});
const selectedLog = ref(null);
const newAppName = ref('');
const newMonitorAppId = ref('');
const newMonitorUrl = ref('');
const filters = reactive({
  app_id: '',
  level: '',
  from: '',
  to: '',
});

function levelClass(level) {
  const m = { error: 'text-red-400', warning: 'text-amber-400', info: 'text-zinc-300', debug: 'text-zinc-500' };
  return m[level] || 'text-zinc-400';
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString();
}

function logout() {
  localStorage.removeItem('ffa_token');
  router.push('/login');
}

async function fetchApps() {
  const { data } = await apps.list();
  applications.value = data;
}

async function fetchMonitors() {
  const { data } = await monitorsApi.list();
  monitors.value = data;
}

async function fetchLogs() {
  const params = {};
  if (filters.app_id) params.app_id = filters.app_id;
  if (filters.level) params.level = filters.level;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  const { data } = await logsApi.list(params);
  logs.value = data;
}

async function fetchPingHistory() {
  const byMonitor = {};
  for (const m of monitors.value) {
    const { data } = await pingHistory.list(m.id, { limit: 24 * 60 });
    byMonitor[m.id] = (data || []).reverse();
  }
  pingHistoryByMonitor.value = byMonitor;
}

function addApp() {
  if (!newAppName.value.trim()) return;
  apps.create(newAppName.value.trim()).then(() => {
    newAppName.value = '';
    fetchApps();
  });
}

function addMonitor() {
  if (!newMonitorAppId.value || !newMonitorUrl.value.trim()) return;
  monitorsApi.create({ app_id: newMonitorAppId.value, url: newMonitorUrl.value.trim() }).then(() => {
    newMonitorUrl.value = '';
    fetchMonitors();
    fetchPingHistory();
  });
}

function openLogDetail(log) {
  selectedLog.value = log;
}

let refreshInterval;
onMounted(() => {
  fetchApps();
  fetchMonitors();
  fetchLogs();
  fetchPingHistory();
  refreshInterval = setInterval(fetchPingHistory, 60 * 1000);
});
onUnmounted(() => clearInterval(refreshInterval));
</script>
