import './styles.css';
import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { registerGlobalTools } from './mcp/globalTools';

// Bootstrap WebMCP. In Chrome 146+ Canary with the flag enabled, the
// polyfill detects the native impl and steps aside. Elsewhere it
// installs `navigator.modelContext` (and the `Testing` shim) so the
// Tool Inspector and our own dev work continue to function.
// Ordinary browser and API automation do not depend on WebMCP.
if (import.meta.env.VITE_ENABLE_WEBMCP === 'true') {
  initializeWebMCPPolyfill({ installTestingShim: true });
  registerGlobalTools();
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
