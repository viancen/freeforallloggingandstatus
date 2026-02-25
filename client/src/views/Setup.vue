<template>
  <div class="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
    <div class="w-full max-w-md rounded-xl bg-zinc-800 shadow-xl border border-zinc-700 p-6">
      <h1 class="text-xl font-semibold text-zinc-100 mb-2">FreeForAll — Setup</h1>
      <p class="text-zinc-400 text-sm mb-6">Configure database and create the first admin account.</p>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
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
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { setup as setupApi } from '../api';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const form = reactive({
  databaseUrl: '',
  email: '',
  password: '',
});

async function submit() {
  error.value = '';
  if (!form.databaseUrl.trim()) {
    error.value = 'Database URL is required';
    return;
  }
  loading.value = true;
  try {
    await setupApi.complete({
      databaseUrl: form.databaseUrl.trim(),
      email: form.email,
      password: form.password,
    });
    router.push('/login');
  } catch (e) {
    error.value = e.response?.data?.error || e.response?.data?.detail || e.message || 'Setup failed';
  } finally {
    loading.value = false;
  }
}
</script>
