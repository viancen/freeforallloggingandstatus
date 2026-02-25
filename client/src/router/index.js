import { createRouter, createWebHistory } from 'vue-router';
import { ready } from '../api';
import Setup from '../views/Setup.vue';
import Login from '../views/Login.vue';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import Overview from '../views/Overview.vue';
import LogsView from '../views/LogsView.vue';
import ApplicationsView from '../views/ApplicationsView.vue';
import MonitorsView from '../views/MonitorsView.vue';

const routes = [
  { path: '/setup', name: 'Setup', component: Setup, meta: { public: true, setup: true } },
  { path: '/login', name: 'Login', component: Login, meta: { public: true } },
  {
    path: '/',
    component: DashboardLayout,
    children: [
      { path: '', name: 'Overview', component: Overview },
      { path: 'logs', name: 'Logs', component: LogsView },
      { path: 'applications', name: 'Applications', component: ApplicationsView },
      { path: 'monitors', name: 'Monitors', component: MonitorsView },
    ],
  },
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
