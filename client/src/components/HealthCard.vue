<template>
  <div
    class="rounded-lg border p-4 transition-colors"
    :class="isUp ? 'border-emerald-700/50 bg-emerald-900/20' : 'border-red-700/50 bg-red-900/20'"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-zinc-200 font-medium truncate flex-1 mr-2" :title="monitor.url">{{ monitor.url }}</span>
      <span
        class="shrink-0 w-3 h-3 rounded-full"
        :class="isUp ? 'bg-emerald-500' : 'bg-red-500'"
        :title="isUp ? 'Up' : 'Down'"
      />
    </div>
    <div class="text-xs text-zinc-400 mb-2">
      {{ monitor.last_status_code != null ? `HTTP ${monitor.last_status_code}` : '—' }}
      <span v-if="lastLatency != null" class="ml-2">{{ lastLatency }} ms</span>
    </div>
    <div class="h-12">
      <canvas ref="chartEl"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const props = defineProps({
  monitor: { type: Object, required: true },
  history: { type: Array, default: () => [] },
});

const chartEl = ref(null);
let chart = null;

const isUp = computed(() => {
  const last = props.history[props.history.length - 1];
  return last ? last.is_up !== false : props.monitor.last_status_code >= 200 && props.monitor.last_status_code < 300;
});

const lastLatency = computed(() => {
  const last = props.history[props.history.length - 1];
  return last?.response_time_ms ?? null;
});

const chartData = computed(() => {
  const points = props.history.slice(-48).map((p) => (p.is_up !== false ? p.response_time_ms : null));
  const labels = points.map((_, i) => '');
  return { labels, values: points };
});

function render() {
  if (!chartEl.value) return;
  if (chart) chart.destroy();
  chart = new Chart(chartEl.value, {
    type: 'line',
    data: {
      labels: chartData.value.labels,
      datasets: [
        {
          data: chartData.value.values,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: false },
        y: {
          min: 0,
          display: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'rgb(161, 161, 170)', maxTicksLimit: 4 },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => (ctx.raw != null ? `${ctx.raw} ms` : 'down'),
          },
        },
      },
    },
  });
}

watch(chartData, render, { deep: true });
onMounted(render);
</script>
