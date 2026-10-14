import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { TransferPage } from './pages/Transfer';
import { RecipientsPage } from './pages/Recipients';
import { TransactionsPage } from './pages/Transactions';
import { RewardsPage } from './pages/Rewards';

export default function App() {
  const [mcpStatus, setMcpStatus] = useState<'active' | 'missing'>('missing');

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_WEBMCP === 'true' && navigator.modelContext) setMcpStatus('active');
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand">
          <div className="dot" />
          <div className="name">AcmeBank</div>
        </div>
        <NavLink to="/rewards" className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}>Rewards</NavLink>
        <NavLink to="/dashboard"   className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}>Dashboard</NavLink>
        <NavLink to="/transfer"    className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}>Transfer</NavLink>
        <NavLink to="/recipients"  className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}>Recipients</NavLink>
        <NavLink to="/transactions"className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}>Transactions</NavLink>

        <div className="mcp-badge">
          <span className="pill">MCP</span>
          {mcpStatus === 'active'  && 'Web MCP active · navigator.modelContext'}
          {mcpStatus === 'missing' && 'WebMCP optional · off'}
        </div>
      </aside>

      <main className="main" id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Navigate to="/rewards" replace />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/transfer"     element={<TransferPage />} />
          <Route path="/recipients"   element={<RecipientsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Routes>
      </main>
    </div>
  );
}
