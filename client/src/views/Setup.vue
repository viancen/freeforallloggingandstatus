<template>
  <div class="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
    <div class="w-full max-w-md rounded-xl bg-zinc-800 shadow-xl border border-zinc-700 p-6">
      <h1 class="text-xl font-semibold text-zinc-100 mb-2">FreeForAll — Setup</h1>
      <p class="text-zinc-400 text-sm mb-6">{{ dockerDatabaseAvailable ? 'Create the first admin account.' : 'Configure database and create the first admin account.' }}</p>
      <form @submit.prevent="submit" class="space-y-4">
        <div v-if="!dockerDatabaseAvailable">
          <label class="block text-sm font-medium text-zinc-300 mb-1">Database URL</label>
          <input
            v-model="form.databaseUrl"
            type="text"
            placeholder="postgres://user:pass@host:5432/dbname"
            class="w-full rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-100 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-zinc-300 mb-1">Admin email</label>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-100 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-zinc-300 mb-1">Admin password</label>
          <input
            v-model="form.password"
            type="password"
            required
            class="w-full rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-100 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 disabled:opacity-50"
        >
          {{ loading ? 'Setting up…' : 'Complete setup' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { setup as setupApi } from '../api';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const dockerDatabaseAvailable = ref(false);
const form = reactive({
  databaseUrl: '',
  email: '',
  password: '',
});

onMounted(async () => {
  try {
    const { data } = await setupApi.status();
    dockerDatabaseAvailable.value = !!data.dockerDatabaseAvailable;
  } catch {
    dockerDatabaseAvailable.value = false;
  }
});

async function submit() {
  error.value = '';
  if (!dockerDatabaseAvailable.value && !form.databaseUrl.trim()) {
    error.value = 'Database URL is required';
    return;
  }
  loading.value = true;
  try {
    const body = { email: form.email, password: form.password };
    if (!dockerDatabaseAvailable.value) body.databaseUrl = form.databaseUrl.trim();
    await setupApi.complete(body);
    router.push('/login');
  } catch (e) {
    error.value = e.response?.data?.error || e.response?.data?.detail || e.message || 'Setup failed';
  } finally {
    loading.value = false;
  }
}
</script>
