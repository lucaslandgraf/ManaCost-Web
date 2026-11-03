// src/App.tsx
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { MonthProvider } from './context/MonthContext';
import { BasketProvider, useBasket } from './context/BasketContext';
import { Sidebar } from './components/layout/Sidebar';
import type { NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { BasketDrawer } from './components/basket/BasketDrawer';

// Modais
import { AuditModal } from './components/modals/AuditModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { QrScannerModal } from './components/modals/QrScannerModal';

// Páginas
import { Dashboard } from './pages/Dashboard';
import { DealsRadar } from './pages/DealsRadar/DealsRadar';
import { Bills } from './pages/Bills/index';
import { Trips } from './pages/Trips/index';

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [auditOpen, setAuditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { items } = useBasket();

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-[#F8FAFC]">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setScannerOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenAudit={() => setAuditOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          currentTab={activeTab}
        />

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && <Dashboard key={refreshKey} />}
          {activeTab === 'deals' && <DealsRadar />}
          {activeTab === 'bills' && <Bills />}
          {activeTab === 'trips' && <Trips />}
        </main>
      </div>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setScannerOpen(true)}
      />

      {/* Botão Flutuante de Acesso Rápido à Cesta */}
      {items.length > 0 && (
        <button
          onClick={() => setBasketOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 transition-transform active:scale-95 animate-bounce-subtle"
        >
          <div className="relative">
            <ShoppingCart size={18} />
            <span className="absolute -top-2 -right-2 bg-slate-950 text-emerald-400 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-emerald-500">
              {items.length}
            </span>
          </div>
          <span className="text-xs">Ver Cesta</span>
        </button>
      )}

      {/* Drawer da Cesta */}
      <BasketDrawer isOpen={basketOpen} onClose={() => setBasketOpen(false)} />

      {auditOpen && <AuditModal onClose={() => setAuditOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {scannerOpen && (
        <QrScannerModal
          onClose={() => setScannerOpen(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <MonthProvider>
      <BasketProvider>
        <AppContent />
      </BasketProvider>
    </MonthProvider>
  );
}