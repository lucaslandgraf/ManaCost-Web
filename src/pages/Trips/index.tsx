import React, { useState, useEffect } from 'react';
import {
  Plus,
  Compass,
  Navigation,
  Check,
  Trash2,
  Share2,
  QrCode,
  BarChart2,
  CheckSquare,
  ArrowLeft,
  Archive,
  Edit2,
  FileSpreadsheet,
  FileText,
  X,
  Plane,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { QrScannerModal } from '../../components/modals/QrScannerModal';
import { supabase } from '../../services/supabase';

interface BudgetEvent {
  id: string;
  user_id: string;
  title: string;
  target_budget: number;
  currency: string;
  description: string | null;
  is_archived?: boolean;
  total_spent?: number;
  created_at?: string;
}

interface EventTransaction {
  id: string;
  event_id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  items?: { name: string; qty: number; unitPrice: number; total: number }[];
  original_total?: number;
  discount?: number;
}

interface ChecklistItem {
  id: string;
  event_id: string;
  title: string;
  description?: string | null;
  is_completed: boolean;
}

type TravelProfile = 'budget' | 'moderate' | 'comfort';

interface ResolvedCity {
  name: string;
  state: string;
  fullTitle: string;
  lon: string;
  lat: string;
}

const DEFAULT_CHECKLIST = [
  { title: 'Levar Powerbank', description: 'Até 20.000mAh na mala de mão' },
  { title: 'Kit Higiene', description: 'Escova, pasta, fio dental, desodorante sólido' },
  { title: 'Medicamentos básicos', description: 'Dipirona, antialérgico, curativos, remédio p/ enjoo' },
  { title: 'Apoio de pescoço', description: 'Para os voos longos e viagens de trem' },
  { title: 'Máscara de olho', description: 'Blackout para dormir' },
  { title: 'Protetor auricular', description: 'Espuma ou silicone para isolamento acústico' },
  { title: 'Levar Tomada Universal / Adaptador', description: 'Padrão europeu / tipo C e F' },
  { title: 'Pochete interna (Doleira)', description: 'Para passaporte, cartões e dinheiro em espécie' },
];

export const Trips: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<BudgetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'active' | 'archived'>('active');

  // Evento em Foco
  const [selectedEvent, setSelectedEvent] = useState<BudgetEvent | null>(null);
  const [eventTransactions, setEventTransactions] = useState<EventTransaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<EventTransaction | null>(null);

  // Modais de Ação do Topo
  const [showEventReportModal, setShowEventReportModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showChecklistReportModal, setShowChecklistReportModal] = useState(false);
  const [showManualExpenseModal, setShowManualExpenseModal] = useState(false);
  const [showQrScanModal, setShowQrScanModal] = useState(false);

  // Formulário Gasto Manual
  const [manualDesc, setManualDesc] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Checklist da Viagem Selecionada
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistDesc, setNewChecklistDesc] = useState('');

  // Modal do Estimador (+ Novo)
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<TravelProfile>('moderate');
  const [origin, setOrigin] = useState('Londrina, PR');
  const [destination, setDestination] = useState('');
  const [resolvedOrigin, setResolvedOrigin] = useState<ResolvedCity | null>(null);
  const [resolvedDest, setResolvedDest] = useState<ResolvedCity | null>(null);
  const [rawRouteKm, setRawRouteKm] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState('');
  const [hasUrbanMargin, setHasUrbanMargin] = useState(true);
  const [days, setDays] = useState('3');
  const [people, setPeople] = useState('2');
  const [fuelPrice, setFuelPrice] = useState('5.79');
  const [consumptionKmPerL, setConsumptionKmPerL] = useState('11');
  const [autoTollEnabled, setAutoTollEnabled] = useState(false);
  const [tollCost, setTollCost] = useState('0');
  const [hotelNightPrice, setHotelNightPrice] = useState('220');
  const [roomsCount, setRoomsCount] = useState('1');
  const [foodPerPersonPerDay, setFoodPerPersonPerDay] = useState('90');
  const [extraExpenses, setExtraExpenses] = useState('150');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchEvents(user.id);
      }
    });
  }, []);

  const fetchEvents = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budget_events')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar viagens:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionsForEvent = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('event_id', eventId)
        .order('date', { ascending: false });

      if (error) throw error;
      setEventTransactions(data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar lançamentos:', err.message);
    }
  };

  const fetchChecklistForEvent = async (eventId: string, uid: string) => {
    try {
      const { data, error } = await supabase
        .from('event_checklists')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const defaultInserts = DEFAULT_CHECKLIST.map((item) => ({
          event_id: eventId,
          user_id: uid,
          title: item.title,
          description: item.description,
          is_completed: false,
        }));

        const { data: createdDefaults } = await supabase
          .from('event_checklists')
          .insert(defaultInserts)
          .select();

        setChecklistItems(createdDefaults || []);
      } else {
        setChecklistItems(data);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar checklist:', err.message);
    }
  };

  const handleOpenEvent = (event: BudgetEvent) => {
    setSelectedEvent(event);
    if (userId) {
      fetchTransactionsForEvent(event.id);
      fetchChecklistForEvent(event.id, userId);
    }
  };

  const handleDeleteEvent = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Deseja excluir permanentemente "${title}" e seus lançamentos?`)) return;

    try {
      await supabase.from('event_checklists').delete().eq('event_id', id);
      await supabase.from('transactions').update({ event_id: null }).eq('event_id', id);
      await supabase.from('budget_events').delete().eq('id', id);
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      if (selectedEvent?.id === id) setSelectedEvent(null);
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // --- LANÇAMENTO DE GASTO MANUAL ---
  const handleSaveManualExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !userId) return;

    const parsedAmount = parseFloat(manualAmount.replace(',', '.'));
    if (!manualDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Informe uma descrição e valor válidos.');
      return;
    }

    try {
      const { error } = await supabase.from('transactions').insert([
        {
          user_id: userId,
          event_id: selectedEvent.id,
          description: manualDesc.trim(),
          amount: parsedAmount,
          type: 'expense',
          date: manualDate,
          is_settled: true,
          budget_bucket: 'wants',
        },
      ]);

      if (error) throw error;

      setShowManualExpenseModal(false);
      setManualDesc('');
      setManualAmount('');
      fetchTransactionsForEvent(selectedEvent.id);
      if (userId) fetchEvents(userId);
    } catch (err: any) {
      alert('Erro ao lançar gasto: ' + err.message);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Deseja excluir este lançamento?')) return;
    try {
      await supabase.from('transactions').delete().eq('id', id);
      if (selectedEvent) {
        fetchTransactionsForEvent(selectedEvent.id);
        if (userId) fetchEvents(userId);
      }
      setSelectedTx(null);
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // --- EXPORTAÇÕES (EXCEL / CSV / WHATSAPP) ---
  const handleExportEventExcel = () => {
    if (!selectedEvent) return;
    const totalSpent = eventTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const saldo = Number(selectedEvent.target_budget) - totalSpent;

    const rows: any[] = eventTransactions.map((t) => ({
      Data: t.date,
      Descrição: t.description,
      'Valor (R$)': Number(t.amount) || 0,
    }));

    rows.push(
      { Data: '', Descrição: '', 'Valor (R$)': '' },
      { Data: 'RESUMO', Descrição: 'META PREVISTA', 'Valor (R$)': selectedEvent.target_budget },
      { Data: 'RESUMO', Descrição: 'TOTAL REALIZADO', 'Valor (R$)': totalSpent },
      { Data: 'RESUMO', Descrição: 'SALDO RESTANTE', 'Valor (R$)': saldo }
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos Viagem');
    XLSX.writeFile(wb, `Relatorio_${selectedEvent.title.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExportChecklistExcel = () => {
    if (!selectedEvent) return;
    const completed = checklistItems.filter((it) => it.is_completed).length;

    const rows: any[] = checklistItems.map((it) => ({
      Status: it.is_completed ? 'CONCLUÍDO' : 'PENDENTE',
      Item: it.title,
      Observações: it.description || '—',
    }));

    rows.push(
      { Status: '', Item: '', Observações: '' },
      { Status: 'RESUMO', Item: 'TOTAL DE ITENS', Observações: checklistItems.length },
      { Status: 'RESUMO', Item: 'ITENS PRONTOS', Observações: completed },
      { Status: 'RESUMO', Item: 'PENDENTES', Observações: checklistItems.length - completed }
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Checklist');
    XLSX.writeFile(wb, `Checklist_${selectedEvent.title.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleShareEventWhatsApp = () => {
    if (!selectedEvent) return;
    const totalSpent = eventTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const saldo = Number(selectedEvent.target_budget) - totalSpent;

    let text = `*RELATÓRIO: ${selectedEvent.title.toUpperCase()}*\n`;
    text += `Meta: R$ ${Number(selectedEvent.target_budget).toFixed(2)}\n`;
    text += `Realizado: R$ ${totalSpent.toFixed(2)}\n`;
    text += `Saldo: R$ ${saldo.toFixed(2)}\n\n`;
    text += `*Lançamentos (${eventTransactions.length}):*\n`;
    eventTransactions.forEach((t) => {
      text += `• ${t.description} - R$ ${Number(t.amount).toFixed(2)}\n`;
    });

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- ESTIMADOR ---
  const handleSelectProfile = (profile: TravelProfile) => {
    setSelectedProfile(profile);
    if (profile === 'budget') {
      setHotelNightPrice('120');
      setFoodPerPersonPerDay('60');
      setExtraExpenses('80');
    } else if (profile === 'moderate') {
      setHotelNightPrice('220');
      setFoodPerPersonPerDay('90');
      setExtraExpenses('150');
    } else if (profile === 'comfort') {
      setHotelNightPrice('380');
      setFoodPerPersonPerDay('160');
      setExtraExpenses('300');
    }
  };

  const resolveCityGeo = async (inputCity: string): Promise<ResolvedCity> => {
    const query = inputCity.trim();
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
      query
    )}&countrycodes=br&featuretype=settlement&limit=1`;

    const res = await fetch(url, { headers: { 'User-Agent': 'ManaCostWeb/1.0' } });
    const data = await res.json();
    if (!data || data.length === 0) {
      throw new Error(`Não encontramos "${inputCity}". Informe a sigla do estado (ex: ${inputCity}, PR).`);
    }
    const item = data[0];
    const cityName =
      item.address?.city || item.address?.town || item.address?.municipality || item.address?.village || item.name;
    const stateName = item.address?.state || '';

    return {
      name: cityName,
      state: stateName,
      fullTitle: stateName ? `${cityName} - ${stateName}` : cityName,
      lon: item.lon,
      lat: item.lat,
    };
  };

  const handleCalculateDistance = async () => {
    if (!origin.trim() || !destination.trim()) {
      alert('Informe a cidade de origem e a de destino.');
      return;
    }
    setLoadingRoute(true);
    try {
      const orig = await resolveCityGeo(origin);
      const dest = await resolveCityGeo(destination);
      setResolvedOrigin(orig);
      setResolvedDest(dest);

      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${orig.lon},${orig.lat};${dest.lon},${dest.lat}?overview=false`
      );
      const routeData = await routeRes.json();

      if (routeData.code === 'Ok' && routeData.routes?.length) {
        const kmTrecho = Math.round(routeData.routes[0].distance / 1000);
        const roundTripRaw = kmTrecho * 2;
        setRawRouteKm(roundTripRaw);
        const finalKm = hasUrbanMargin ? Math.round(roundTripRaw * 1.12) : roundTripRaw;
        setDistanceKm(String(finalKm));

        if (autoTollEnabled) {
          setTollCost(String(Math.round(roundTripRaw * 0.14)));
        }
      } else {
        throw new Error('Não foi possível traçar rota rodoviária entre essas cidades.');
      }
    } catch (err: any) {
      alert(err.message || 'Falha ao buscar cidades.');
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleToggleUrbanMargin = () => {
    const nextEnabled = !hasUrbanMargin;
    setHasUrbanMargin(nextEnabled);
    if (rawRouteKm !== null) {
      setDistanceKm(String(nextEnabled ? Math.round(rawRouteKm * 1.12) : rawRouteKm));
    }
  };

  const handleToggleAutoToll = () => {
    const nextEnabled = !autoTollEnabled;
    setAutoTollEnabled(nextEnabled);
    if (nextEnabled) {
      const baseKm = rawRouteKm || parseFloat(distanceKm.replace(',', '.')) || 0;
      setTollCost(String(Math.round(baseKm * 0.14)));
    } else {
      setTollCost('0');
    }
  };

  const numDays = Math.max(1, parseInt(days, 10) || 1);
  const numPeople = Math.max(1, parseInt(people, 10) || 1);
  const numRooms = Math.max(1, parseInt(roomsCount, 10) || 1);
  const numDistance = parseFloat(distanceKm.replace(',', '.')) || 0;
  const numFuelPrice = parseFloat(fuelPrice.replace(',', '.')) || 0;
  const numKmL = Math.max(1, parseFloat(consumptionKmPerL.replace(',', '.')) || 1);
  const numTolls = parseFloat(tollCost.replace(',', '.')) || 0;
  const numHotelDaily = parseFloat(hotelNightPrice.replace(',', '.')) || 0;
  const numFoodDaily = parseFloat(foodPerPersonPerDay.replace(',', '.')) || 0;
  const numExtra = parseFloat(extraExpenses.replace(',', '.')) || 0;

  const fuelTotal = (numDistance / numKmL) * numFuelPrice;
  const transportTotal = fuelTotal + numTolls;
  const nights = Math.max(1, numDays - 1);
  const hotelTotal = nights * numHotelDaily * numRooms;
  const foodTotal = numDays * numPeople * numFoodDaily;
  const grandTotal = transportTotal + hotelTotal + foodTotal + numExtra;
  const costPerPerson = grandTotal / numPeople;

  const handleCreateAsEvent = async () => {
    const finalDestName = resolvedDest ? resolvedDest.fullTitle : destination.trim();
    const finalOrigName = resolvedOrigin ? resolvedOrigin.fullTitle : origin.trim();
    if (!finalDestName || !userId) return;

    setSavingEvent(true);
    try {
      const routeDesc = finalOrigName ? `${finalOrigName} -> ${finalDestName}` : finalDestName;
      const profileLabel =
        selectedProfile === 'budget'
          ? 'Mochilão / Económico'
          : selectedProfile === 'comfort'
          ? 'Conforto / Casal'
          : 'Padrão / Moderado';

      const simulationSummary =
        `Simulação: ${routeDesc}\n` +
        `• Perfil: ${profileLabel}\n` +
        `• Duração: ${numDays} dias (${nights} noites) | ${numPeople} pessoa(s)\n` +
        `• Transporte: R$ ${transportTotal.toFixed(2)} (${numDistance} km rodados` +
        (hasUrbanMargin && rawRouteKm ? ` [inclui +12% de margem urbana sobre ${rawRouteKm} km de estrada]` : '') +
        (autoTollEnabled ? ` [inclui R$ ${tollCost} de pedágios estimados]` : '') +
        `)\n` +
        `• Hospedagem: R$ ${hotelTotal.toFixed(2)} (${numRooms} quarto(s) a R$ ${numHotelDaily.toFixed(2)}/noite)\n` +
        `• Alimentação: R$ ${foodTotal.toFixed(2)} (R$ ${numFoodDaily.toFixed(2)}/dia/pessoa)\n` +
        (numExtra > 0 ? `• Extras / Passeios: R$ ${numExtra.toFixed(2)}\n` : '') +
        `• Custo Médio por Pessoa: R$ ${costPerPerson.toFixed(2)}`;

      const eventTitle = resolvedDest
        ? `Viagem: ${resolvedDest.name} (${resolvedDest.state.slice(0, 2).toUpperCase() || 'BR'})`
        : `Viagem: ${destination.trim()}`;

      const { data, error } = await supabase
        .from('budget_events')
        .insert([
          {
            user_id: userId,
            title: eventTitle,
            target_budget: parseFloat(grandTotal.toFixed(2)),
            currency: 'BRL',
            description: simulationSummary,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setIsEstimatorOpen(false);
      fetchEvents(userId);
      if (data) handleOpenEvent(data);
    } catch (err: any) {
      alert('Erro ao criar viagem: ' + err.message);
    } finally {
      setSavingEvent(false);
    }
  };

  // Checklist Helpers
  const toggleChecklistItem = async (item: ChecklistItem) => {
    const updatedStatus = !item.is_completed;
    setChecklistItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, is_completed: updatedStatus } : it))
    );
    await supabase.from('event_checklists').update({ is_completed: updatedStatus }).eq('id', item.id);
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim() || !selectedEvent || !userId) return;

    try {
      const { data, error } = await supabase
        .from('event_checklists')
        .insert([
          {
            event_id: selectedEvent.id,
            user_id: userId,
            title: newChecklistTitle.trim(),
            description: newChecklistDesc.trim() || null,
            is_completed: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) setChecklistItems((prev) => [...prev, data]);
      setNewChecklistTitle('');
      setNewChecklistDesc('');
    } catch (err: any) {
      alert('Erro ao adicionar item: ' + err.message);
    }
  };

  const handleDeleteChecklistItem = async (id: string) => {
    setChecklistItems((prev) => prev.filter((it) => it.id !== id));
    await supabase.from('event_checklists').delete().eq('id', id);
  };

  const completedChecklistCount = checklistItems.filter((it) => it.is_completed).length;
  const checklistPercent =
    checklistItems.length > 0 ? (completedChecklistCount / checklistItems.length) * 100 : 0;

  const totalSpentCalculated = eventTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const activeEvents = events.filter((ev) => !ev.is_archived);
  const archivedEvents = events.filter((ev) => ev.is_archived);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. VISUALIZAÇÃO DE DETALHES DE UMA VIAGEM SELECIONADA */}
      {selectedEvent ? (
        <div className="space-y-5 animate-fade-in">
          {/* Top Bar: Voltar + 4 Botões de Ação */}
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <button
              onClick={() => setSelectedEvent(null)}
              className="p-2 rounded-xl bg-[#131927] border border-white/5 text-emerald-400 hover:text-emerald-300 transition"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEventReportModal(true)}
                className="p-2.5 rounded-xl bg-[#131927] border border-white/5 text-sky-400 hover:bg-[#1E293B] transition"
                title="Relatório e Fechamento da Viagem"
              >
                <BarChart2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowChecklistModal(true)}
                className="p-2.5 rounded-xl bg-[#131927] border border-white/5 text-emerald-400 hover:bg-[#1E293B] transition"
                title="Checklist de Bagagem"
              >
                <CheckSquare className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowQrScanModal(true)}
                className="p-2.5 rounded-xl bg-[#131927] border border-white/5 text-sky-400 hover:bg-[#1E293B] transition"
                title="Escanear NFC-e para esta viagem"
              >
                <QrCode className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowManualExpenseModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                <Plus className="w-4 h-4" />
                Gasto
              </button>
            </div>
          </div>

          {/* Cabeçalho do Evento */}
          <div className="bg-[#131927] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-100">{selectedEvent.title}</h2>
                <p className="text-xs text-slate-400 mt-1">Despesas em {selectedEvent.currency}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg">
                {selectedEvent.currency}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/5">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Total Gasto</span>
                <p
                  className={`text-2xl font-black mt-1 ${
                    totalSpentCalculated > selectedEvent.target_budget ? 'text-rose-400' : 'text-slate-100'
                  }`}
                >
                  {selectedEvent.currency} {totalSpentCalculated.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Meta Prevista</span>
                <p className="text-2xl font-black text-slate-200 mt-1">
                  {selectedEvent.currency} {Number(selectedEvent.target_budget).toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>

            <div className="w-full h-1.5 bg-[#0B0F19] rounded-full overflow-hidden mt-4">
              <div
                className={`h-full rounded-full transition-all ${
                  totalSpentCalculated > selectedEvent.target_budget ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, (totalSpentCalculated / (selectedEvent.target_budget || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Estimativa & Memória de Cálculo */}
          {selectedEvent.description && (
            <div className="bg-[#0f172a]/70 border border-sky-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                <Compass className="w-4 h-4" />
                <span>Estimativa & Memória de Cálculo:</span>
              </div>
              <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                {selectedEvent.description}
              </pre>
            </div>
          )}

          {/* Lançamentos Registados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">Lançamentos Registados</h3>
              <span className="text-xs text-slate-400">{eventTransactions.length} lançamento(s)</span>
            </div>

            {eventTransactions.length === 0 ? (
              <div className="bg-[#131927] border border-white/5 rounded-2xl p-10 text-center text-slate-500">
                <p className="text-xs text-slate-400">Nenhum gasto lançado para esta viagem ainda.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Toque em "+ Gasto" ou escaneie uma NFC-e para vincular.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {eventTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="bg-[#131927] border border-white/5 hover:border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-4 cursor-pointer transition"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-100 truncate">{tx.description}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {tx.category || 'Geral'} • {tx.date ? tx.date.split('-').reverse().join('/') : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-extrabold text-rose-400">
                        - {selectedEvent.currency} {Number(tx.amount).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. TELA PRINCIPAL: LISTAGEM DE VIAGENS */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">Viagens & Eventos</h1>
              <p className="text-xs text-slate-400 mt-1">Orçamentos fechados e checklists de bagagem</p>
            </div>

            <button
              onClick={() => setIsEstimatorOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusTab('active')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusTab === 'active'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-[#131927] border border-white/5 text-slate-400'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Em Andamento ({activeEvents.length})
            </button>
            <button
              onClick={() => setStatusTab('archived')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusTab === 'archived'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-[#131927] border border-white/5 text-slate-400'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Concluídos ({archivedEvents.length})
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">A carregar viagens...</div>
          ) : activeEvents.length === 0 ? (
            <div className="bg-[#131927] border border-white/5 rounded-2xl p-12 text-center text-slate-500">
              <Plane className="w-10 h-10 mx-auto mb-2 text-slate-600 stroke-1" />
              <p className="text-sm font-bold text-slate-300">Nenhuma viagem em andamento</p>
              <p className="text-xs text-slate-500 mt-1">Clique em "+ Novo" para estimar e criar uma viagem.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => handleOpenEvent(ev)}
                  className="bg-[#131927] border border-white/5 hover:border-emerald-500/30 rounded-2xl p-4 space-y-4 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <Navigation className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">{ev.title}</h3>
                        <p className="text-[11px] text-slate-400">Moeda oficial: {ev.currency}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#0B0F19] text-[10px] font-bold text-emerald-400 border border-white/5">
                        {ev.currency}
                      </span>
                      <button
                        onClick={(e) => handleDeleteEvent(e, ev.id, ev.title)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Total gasto</span>
                      <p className="text-sm font-bold text-slate-200">
                        {ev.currency} {(ev.total_spent || 0).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Meta estipulada</span>
                      <p className="text-sm font-bold text-slate-200">
                        {ev.currency} {Number(ev.target_budget).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-1 bg-[#0B0F19] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ev.target_budget ? ((ev.total_spent || 0) / ev.target_budget) * 100 : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: RELATÓRIO DA VIAGEM */}
      {showEventReportModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-sky-400" />
                  Relatório: {selectedEvent.title}
                </h3>
                <p className="text-xs text-slate-400">Consolidação e fecho de contas da viagem</p>
              </div>
              <button onClick={() => setShowEventReportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#131927] p-3 rounded-xl border border-white/5 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Meta</span>
                <p className="text-xs font-black text-slate-200 mt-1">
                  R$ {Number(selectedEvent.target_budget).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Realizado</span>
                <p className="text-xs font-black text-rose-400 mt-1">
                  R$ {totalSpentCalculated.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Saldo</span>
                <p
                  className={`text-xs font-black mt-1 ${
                    Number(selectedEvent.target_budget) - totalSpentCalculated < 0 ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  R$ {(Number(selectedEvent.target_budget) - totalSpentCalculated).toFixed(2)}
                </p>
              </div>
            </div>

            <button
              onClick={handleExportEventExcel}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Planilha Excel (.xlsx)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShareEventWhatsApp}
                className="py-2.5 bg-[#131927] border border-sky-500/30 text-sky-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#1E293B] transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                Partilhar Texto
              </button>
              <button
                onClick={handleExportEventExcel}
                className="py-2.5 bg-[#131927] border border-white/10 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#1E293B] transition"
              >
                <FileText className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
            </div>

            <button
              onClick={() => setShowEventReportModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#131927] text-slate-300 font-bold text-xs hover:bg-slate-800 transition"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECKLIST DE BAGAGEM DA VIAGEM */}
      {showChecklistModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0B0F19] border border-white/10 rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#131927]">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Checklist de Bagagem
                </h3>
                <p className="text-xs text-slate-400">{selectedEvent.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChecklistReportModal(true)}
                  className="p-2 rounded-lg bg-[#0B0F19] text-sky-400 hover:text-white border border-white/5"
                  title="Relatório do Checklist"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowChecklistModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-[#131927] border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Itens Preparados</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {completedChecklistCount} de {checklistItems.length} ({Math.round(checklistPercent)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              </div>

              <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do item (ex: Ténis, Casaco)"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  className="flex-1 bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  + Item
                </button>
              </form>

              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-[#131927] border rounded-xl p-3 flex items-center justify-between gap-3 ${
                      item.is_completed ? 'border-white/5 opacity-60' : 'border-white/10'
                    }`}
                  >
                    <div
                      onClick={() => toggleChecklistItem(item)}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          item.is_completed ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700'
                        }`}
                      >
                        {item.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            item.is_completed ? 'line-through text-slate-400' : 'text-slate-100'
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.description && <p className="text-[10px] text-slate-500">{item.description}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2.1: RELATÓRIO DO CHECKLIST */}
      {showChecklistReportModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-sky-400" />
                  Relatório: Checklist
                </h3>
                <p className="text-xs text-slate-400">Auditoria de bagagem para {selectedEvent.title}</p>
              </div>
              <button onClick={() => setShowChecklistReportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-[#131927] p-3 rounded-xl border border-white/5 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400">Total</span>
                <p className="text-sm font-black text-sky-400 mt-1">{checklistItems.length}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400">Prontos</span>
                <p className="text-sm font-black text-emerald-400 mt-1">{completedChecklistCount}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400">Pendentes</span>
                <p className="text-sm font-black text-amber-400 mt-1">
                  {checklistItems.length - completedChecklistCount}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400">Concluído</span>
                <p className="text-sm font-black text-sky-400 mt-1">{Math.round(checklistPercent)}%</p>
              </div>
            </div>

            <button
              onClick={handleExportChecklistExcel}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Planilha Excel (.xlsx)
            </button>

            <button
              onClick={() => setShowChecklistReportModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#131927] text-slate-300 font-bold text-xs hover:bg-slate-800 transition"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: SCAN QR VIA CÂMARA / MODAL OFICIAL */}
      {showQrScanModal && selectedEvent && (
        <QrScannerModal
          eventId={selectedEvent.id}
          onClose={() => setShowQrScanModal(false)}
          onSuccess={() => {
            fetchTransactionsForEvent(selectedEvent.id);
            if (userId) fetchEvents(userId);
          }}
        />
      )}

      {/* MODAL 4: + GASTO MANUAL */}
      {showManualExpenseModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-100">Lançar Despesa na Viagem</h3>
              <button onClick={() => setShowManualExpenseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualExpense} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">DESCRIÇÃO</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jantar, Abastecimento, Hotel"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">VALOR ({selectedEvent.currency})</label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">DATA</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualExpenseModal(false)}
                  className="flex-1 py-2.5 bg-[#131927] text-slate-400 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Gravar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DETALHE DO LANÇAMENTO / CUPOM */}
      {selectedTx && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  Detalhe do Lançamento
                </span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">{selectedTx.description}</h3>
                <p className="text-[10px] text-slate-500">{selectedTx.category || 'Alimentação'} • {selectedTx.date}</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#131927] p-4 rounded-xl border border-white/5 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Gasto</span>
              <p className="text-2xl font-black text-rose-400 mt-1">
                - {selectedEvent.currency} {Number(selectedTx.amount).toFixed(2).replace('.', ',')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setManualDesc(selectedTx.description);
                  setManualAmount(String(selectedTx.amount));
                  setManualDate(selectedTx.date);
                  setShowManualExpenseModal(true);
                  setSelectedTx(null);
                }}
                className="py-2.5 bg-[#131927] border border-sky-500/30 text-sky-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar
              </button>
              <button
                onClick={() => handleDeleteTransaction(selectedTx.id)}
                className="py-2.5 bg-[#131927] border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>

            {selectedTx.items && selectedTx.items.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                  Itens Discriminados no Cupom
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {selectedTx.items.map((it, idx) => (
                    <div key={idx} className="bg-[#131927] p-2.5 rounded-lg flex justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{it.name}</p>
                        <p className="text-[10px] text-slate-500">{it.qty}x R$ {it.unitPrice.toFixed(2)}</p>
                      </div>
                      <p className="font-bold text-slate-200">R$ {it.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-[#131927] text-slate-300 font-bold text-xs hover:bg-slate-800 transition"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: ESTIMADOR DE VIAGEM (+ NOVO) */}
      {isEstimatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0B0F19] border border-white/10 rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#131927]">
              <div>
                <h3 className="text-base font-bold text-slate-100">Estimador de Viagem</h3>
                <p className="text-xs text-slate-400">Planeamento com margem rodoviária e urbana</p>
              </div>
              <button onClick={() => setIsEstimatorOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-2">
                  Perfil de Viagem
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSelectProfile('budget')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      selectedProfile === 'budget'
                        ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                        : 'bg-[#131927] border-white/5 text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-200">Económico</p>
                    <p className="text-[10px] text-slate-400">Hostel & Lanches</p>
                  </button>
                  <button
                    onClick={() => handleSelectProfile('moderate')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      selectedProfile === 'moderate'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                        : 'bg-[#131927] border-white/5 text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-200">Moderado</p>
                    <p className="text-[10px] text-slate-400">Hotel 3★ & PF</p>
                  </button>
                  <button
                    onClick={() => handleSelectProfile('comfort')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      selectedProfile === 'comfort'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                        : 'bg-[#131927] border-white/5 text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-200">Conforto</p>
                    <p className="text-[10px] text-slate-400">Resort & Jantares</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Origem</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => {
                      setOrigin(e.target.value);
                      setResolvedOrigin(null);
                    }}
                    placeholder="Londrina, PR"
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Destino</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setResolvedDest(null);
                    }}
                    placeholder="Curitiba, PR"
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCalculateDistance}
                disabled={loadingRoute}
                className="w-full py-2 bg-[#131927] border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/10 transition flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                {loadingRoute ? 'A traçar rota...' : 'Traçar Rota & Distância Automática'}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Km Total</label>
                  <input
                    type="number"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Dias</label>
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Pessoas</label>
                  <input
                    type="number"
                    value={people}
                    onChange={(e) => setPeople(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={hasUrbanMargin}
                  onClick={handleToggleUrbanMargin}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    hasUrbanMargin
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#131927] border-white/5 text-slate-400'
                  }`}
                >
                  Margem urbana (+12%): {hasUrbanMargin ? 'Ativada' : 'Desativada'}
                </button>
                <button
                  type="button"
                  aria-pressed={autoTollEnabled}
                  onClick={handleToggleAutoToll}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    autoTollEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#131927] border-white/5 text-slate-400'
                  }`}
                >
                  Estimar pedágios: {autoTollEnabled ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Combustível (R$/L)</label>
                  <input
                    type="text"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Consumo (Km/L)</label>
                  <input
                    type="text"
                    value={consumptionKmPerL}
                    onChange={(e) => setConsumptionKmPerL(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Quartos</label>
                  <input
                    type="number"
                    min="1"
                    value={roomsCount}
                    onChange={(e) => setRoomsCount(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Pedágios (R$)</label>
                  <input
                    type="text"
                    value={tollCost}
                    onChange={(e) => setTollCost(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Diária hotel (R$)</label>
                  <input
                    type="text"
                    value={hotelNightPrice}
                    onChange={(e) => setHotelNightPrice(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Alimentação/dia (R$)</label>
                  <input
                    type="text"
                    value={foodPerPersonPerDay}
                    onChange={(e) => setFoodPerPersonPerDay(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Extras (R$)</label>
                  <input
                    type="text"
                    value={extraExpenses}
                    onChange={(e) => setExtraExpenses(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#131927] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Transporte ({numDistance} km):</span>
                  <span>R$ {transportTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Hospedagem ({nights} noites):</span>
                  <span>R$ {hotelTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Alimentação:</span>
                  <span>R$ {foodTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-baseline">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Orçamento Previsto</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    R$ {grandTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-[#131927] flex gap-2">
              <button
                onClick={() => setIsEstimatorOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#0B0F19] text-slate-400 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAsEvent}
                disabled={savingEvent}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
              >
                {savingEvent ? 'A criar...' : 'Criar Viagem com essa Meta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};