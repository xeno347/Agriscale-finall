// Central API base URL config for the app
// Use Vite env `VITE_API_BASE_URL` if provided, otherwise fallback to localhost.

// In production, set VITE_API_BASE_URL=/api to match Nginx proxy.
// In local dev, use your backend URL (e.g., http://localhost:8000).
let baseUrl: string = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const getBaseUrl = (): string => baseUrl;

export const setBaseUrl = (url: string) => {
  baseUrl = url;
};

export default getBaseUrl;

// =========================
// MODULE GROUPS CONFIG
// =========================
export const MODULE_GROUPS = [
  {
    key: 'operation',
    label: 'Operation',
    modules: [
      {
        key: 'cultivation-master',
        label: 'Cultivation Master',
        path: '/cultivation-master',
        component: 'CultivationMasterModule', // Should be imported dynamically in router
        description: 'Create and manage week-wise activity planners for your farm.'
      },
      {
        key: 'cultivation-plan',
        label: 'Cultivation Plan',
        path: '/cultivation-plan',
        component: 'CultivationPlanModule',
        description: 'View and manage cultivation plans.'
      }
    ]
  }
];
