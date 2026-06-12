import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from '@/context/AuthContext';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[SW] Registration failed:', err);
    });
  });
}

createRoot(document.getElementById("root")!).render(
	<AuthProvider>
		<App />
	</AuthProvider>,
);
