<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" @click.self="$emit('close')">
    <div class="bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
      <div class="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
        <h3 class="font-medium text-zinc-100">Log detail</h3>
        <button
          @click="$emit('close')"
          class="text-zinc-400 hover:text-zinc-200 p-1"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div class="p-4 overflow-y-auto flex-1 space-y-4">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="text-zinc-500">Time</div>
          <div class="text-zinc-200">{{ formatDate(log.created_at) }}</div>
          <div class="text-zinc-500">App</div>
          <div class="text-zinc-200">{{ log.app_name }}</div>
          <div class="text-zinc-500">Level</div>
          <div :class="levelClass(log.level)">{{ log.level }}</div>
          <div class="text-zinc-500">Environment</div>
          <div class="text-zinc-200">{{ log.environment || '—' }}</div>
          <div class="text-zinc-500">Hostname</div>
          <div class="text-zinc-200">{{ log.hostname || '—' }}</div>
        </div>
        <div>
          <div class="text-zinc-500 text-sm mb-1">Message</div>
          <pre class="bg-zinc-900 rounded-lg p-3 text-zinc-200 text-sm overflow-x-auto">{{ log.message }}</pre>
        </div>
        <div v-if="hasContext">
          <div class="text-zinc-500 text-sm mb-1">Context / Stack trace</div>
          <pre class="bg-zinc-900 rounded-lg p-3 text-sm overflow-x-auto overflow-y-auto max-h-96 json-block">{{ formattedContext }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  log: { type: Object, required: true },
});

defineEmits(['close']);

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function levelClass(level) {
  const m = { error: 'text-red-400', warning: 'text-amber-400', info: 'text-zinc-300', debug: 'text-zinc-500' };
  return m[level] || 'text-zinc-400';
}

const hasContext = computed(() => {
  const c = props.log.context;
  return c != null && (typeof c === 'object' ? Object.keys(c).length > 0 : String(c).trim() !== '');
});

const formattedContext = computed(() => {
  const c = props.log.context;
  if (c == null) return '';
  if (typeof c === 'string') {
    try {
      return JSON.stringify(JSON.parse(c), null, 2);
    } catch {
      return c;
    }
  }
  return JSON.stringify(c, null, 2);
});
</script>

<style scoped>
.json-block {
  font-family: ui-monospace, monospace;
  color: #e4e4e7;
}
.json-block :deep(.key) { color: #a5f3fc; }
</style>
