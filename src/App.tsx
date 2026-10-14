import { useEffect } from 'react';
import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, Gift, Landmark, LayoutDashboard, ListChecks, Users, WalletCards } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { TransferPage } from './pages/Transfer';
import { RecipientsPage } from './pages/Recipients';
import { TransactionsPage } from './pages/Transactions';
import { RewardsPage } from './pages/Rewards';
import { SettlementsPage } from './pages/Settlements';

export default function App() {
  const location = useLocation();
  const operations = location.pathname.startsWith('/operations');
  useEffect(() => { document.title = operations ? 'MustBank | Operations' : 'MustBank | Personal banking'; }, [operations]);
  const navigation = operations ? [{ to: '/operations/settlements', label: 'Reward settlements', icon: ListChecks }] : [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { to: '/transfer', label: 'Transfers', icon: ArrowLeftRight },
    { to: '/recipients', label: 'Recipients', icon: Users }, { to: '/transactions', label: 'Activity', icon: ListChecks }, { to: '/rewards', label: 'Rewards', icon: Gift },
  ];
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar" aria-label="Application navigation">
      <NavLink to={operations ? '/operations/settlements' : '/dashboard'} className="brand" aria-label="MustBank home"><Landmark size={26} strokeWidth={1.8} aria-hidden="true" /><span>MustBank</span></NavLink>
      <p className="nav-caption">{operations ? 'Operations' : 'Your bank'}</p>
      <nav aria-label={operations ? 'Operations' : 'Personal banking'}>{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><Icon size={19} strokeWidth={1.7} aria-hidden="true" />{label}</NavLink>)}</nav>
      <div className="sidebar-footer">{operations ? <NavLink className="nav-item" to="/dashboard"><ArrowLeft size={18} aria-hidden="true" />Return to banking</NavLink> : <div className="account-context"><WalletCards size={21} aria-hidden="true" /><div><strong>Personal banking</strong><span>Singapore dollar accounts</span></div></div>}</div>
    </aside><div className="main-shell"><div className="topbar"><span>{operations ? 'Operations workspace' : 'Personal banking'}</span><span className="topbar-meta">MustBank</span></div>
      <main id="main-content" className="main" tabIndex={-1}><Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transfer" element={<TransferPage />} /><Route path="/recipients" element={<RecipientsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} /><Route path="/rewards" element={<RewardsPage />} />
        <Route path="/operations" element={<Navigate to="/operations/settlements" replace />} /><Route path="/operations/settlements" element={<SettlementsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></main></div></div>;
}
