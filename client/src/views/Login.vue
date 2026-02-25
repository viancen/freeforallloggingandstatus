<template>
  <div class="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
    <div class="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl p-8">
      <div class="flex items-center gap-3 mb-6">
        <div class="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <CubeIcon class="h-7 w-7 text-emerald-400" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-zinc-100">Log in</h1>
          <p class="text-zinc-500 text-sm">FreeForAll Dashboard</p>
        </div>
      </div>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-zinc-400 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-zinc-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-zinc-400 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div v-if="error" class="text-red-400 text-sm flex items-center gap-2">
          <ExclamationCircleIcon class="h-4 w-4 shrink-0" />
          {{ error }}
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 disabled:opacity-50 transition-colors"
        >
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { CubeIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline';
import { auth } from '../api';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const { data } = await auth.login(email.value, password.value);
    localStorage.setItem('ffa_token', data.token);
    router.push('/');
  } catch (e) {
    error.value = e.response?.data?.error || 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>
