// src/App.tsx
import { useState } from 'react';
import { MonthProvider } from './context/MonthContext';
import { BasketProvider } from './context/BasketContext';
import { Sidebar } from './components/layout/Sidebar';
import type { NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';

// Modais
import { AuditModal } from './components/modals/AuditModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { QrScannerModal } from './components/modals/QrScannerModal';

// Páginas
import { Dashboard } from './pages/Dashboard';
import { DealsRadar } from './pages/DealsRadar/DealsRadar';
import { Bills } from './pages/Bills';
import { Trips } from './pages/Trips';


export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [auditOpen, setAuditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <MonthProvider>
      <BasketProvider>
        <div className="flex min-h-screen bg-[#0B0F19] text-[#F8FAFC]">
          {/* Navegação Lateral Desktop */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenScanner={() => setScannerOpen(true)}
          />

          {/* Área Principal de Conteúdo */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header
              onOpenAudit={() => setAuditOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'deals' && <DealsRadar />}
              {activeTab === 'bills' && <Bills />}
              {activeTab === 'trips' && <Trips />}
            </main>
          </div>

          {/* Navegação Inferior Mobile */}
          <BottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenScanner={() => setScannerOpen(true)}
          />

          {/* Modais Globais */}
          {auditOpen && <AuditModal onClose={() => setAuditOpen(false)} />}
          {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
          {scannerOpen && <QrScannerModal onClose={() => setScannerOpen(false)} />}
        </div>
      </BasketProvider>
    </MonthProvider>
  );
}