// Central API base URL config for the app
// Use Vite env `VITE_API_BASE_URL` if provided, otherwise fallback to localhost.

let baseUrl: string = (import.meta as any).env?.VITE_API_BASE_URL ?? 'https://99c34baf7444.ngrok-free.app';

export const getBaseUrl = (): string => baseUrl;

export const setBaseUrl = (url: string) => {
  baseUrl = url;
};

export default getBaseUrl;
