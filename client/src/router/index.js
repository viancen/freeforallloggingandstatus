import { createRouter, createWebHistory } from 'vue-router';
import { ready } from '../api';
import Setup from '../views/Setup.vue';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';

const routes = [
  { path: '/setup', name: 'Setup', component: Setup, meta: { public: true, setup: true } },
  { path: '/login', name: 'Login', component: Login, meta: { public: true } },
  { path: '/', name: 'Dashboard', component: Dashboard },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  if (to.meta.setup) return next();
  try {
    const { data } = await ready();
    if (data.setupRequired) return next({ name: 'Setup' });
  } catch {
    if (window.__ffaSetupRequired) return next({ name: 'Setup' });
  }
  if (to.meta.public) {
    if (localStorage.getItem('ffa_token')) return next({ path: '/' });
    return next();
  }
  if (!localStorage.getItem('ffa_token')) return next({ name: 'Login' });
  next();
});

export default router;
