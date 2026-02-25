<template>
  <div class="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
    <div class="w-full max-w-md rounded-xl bg-zinc-800 border border-zinc-700 p-6">
      <h1 class="text-xl font-semibold text-zinc-100 mb-2">Log in</h1>
      <p class="text-zinc-400 text-sm mb-6">FreeForAll Dashboard</p>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-zinc-300 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-100 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-zinc-300 mb-1">Password</label>
          <input
            v-model="password"
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
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
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
