import React, { useEffect, useState } from 'react';
import { X, Download, Loader2, PieChart, MessageSquareShare, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useMonth } from '../../context/MonthContext';

interface AuditModalProps {
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ onClose }) => {
  const { currentDate, formattedMonth } = useMonth();
  const [loading, setLoading] = useState(true);

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const [spentNeeds, setSpentNeeds] = useState(0);
  const [spentWants, setSpentWants] = useState(0);
  const [spentSavings, setSpentSavings] = useState(0);

  const [rawTransactions, setRawTransactions] = useState<any[]>([]);

  const [budgetRules, setBudgetRules] = useState({
    useFixed: false,
    needsPct: 50,
    wantsPct: 30,
    savingsPct: 20,
    fixedNeeds: 0,
    fixedWants: 0,
    fixedSavings: 0,
  });

  useEffect(() => {
    loadAuditData();
  }, [currentDate]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('rule_needs_pct, rule_wants_pct, rule_savings_pct, use_fixed_targets, fixed_needs_val, fixed_wants_val, fixed_savings_val')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setBudgetRules({
          useFixed: Boolean(profile.use_fixed_targets),
          needsPct: Number(profile.rule_needs_pct ?? 50),
          wantsPct: Number(profile.rule_wants_pct ?? 30),
          savingsPct: Number(profile.rule_savings_pct ?? 20),
          fixedNeeds: Number(profile.fixed_needs_val ?? 0),
          fixedWants: Number(profile.fixed_wants_val ?? 0),
          fixedSavings: Number(profile.fixed_savings_val ?? 0),
        });
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data: txList } = await supabase
        .from('transactions')
        .select('id, description, amount, type, date, is_settled, split_status, budget_bucket, categories(name, rule_group)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      const items = txList || [];
      setRawTransactions(items);

      let income = 0;
      let expense = 0;
      let needs = 0;
      let wants = 0;
      let savings = 0;

      items.forEach((item: any) => {
        const val = Number(item.amount) || 0;
        const rawCat = item.categories;
        const catObj = Array.isArray(rawCat) ? rawCat[0] : rawCat;

        if (item.type === 'income') {
          income += val;
        } else {
          if (item.split_status === 'settled') return;
          expense += val;

          if (item.budget_bucket === 'needs') needs += val;
          else if (item.budget_bucket === 'wants') wants += val;
          else if (item.budget_bucket === 'savings') savings += val;
          else {
            if (catObj?.rule_group === 'needs_50') needs += val;
            else if (catObj?.rule_group === 'wants_30') wants += val;
            else if (catObj?.rule_group === 'savings_20') savings += val;
            else needs += val;
          }
        }
      });

      setTotalIncome(income);
      setTotalExpense(expense);
      setSpentNeeds(needs);
      setSpentWants(wants);
      setSpentSavings(savings);
    } catch (err) {
      console.warn('Erro ao gerar auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = totalIncome - totalExpense;

  const budgetNeeds = budgetRules.useFixed
    ? budgetRules.fixedNeeds
    : totalIncome * (budgetRules.needsPct / 100);

  const budgetWants = budgetRules.useFixed
    ? budgetRules.fixedWants
    : totalIncome * (budgetRules.wantsPct / 100);

  const budgetSavings = budgetRules.useFixed
    ? budgetRules.fixedSavings
    : totalIncome * (budgetRules.savingsPct / 100);

  // 1. Exportação em Excel Nativo (.xls/.xlsx compatível sem libs extras)
  const exportExcel = () => {
    if (rawTransactions.length === 0) {
      alert('Não existem lançamentos para exportar neste mês.');
      return;
    }

    let excelTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Extrato ManaCost</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #10B981; color: #ffffff; font-weight: bold;">
              <th>Data</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Valor (R$)</th>
              <th>Categoria</th>
              <th>Efetivado</th>
            </tr>
          </thead>
          <tbody>
    `;

    rawTransactions.forEach((tx) => {
      const catName = (Array.isArray(tx.categories) ? tx.categories[0]?.name : tx.categories?.name) || 'Geral';
      const isInc = tx.type === 'income';
      excelTable += `
        <tr>
          <td>${tx.date || ''}</td>
          <td>${tx.description || ''}</td>
          <td style="color: ${isInc ? '#059669' : '#dc2626'};">${isInc ? 'Receita' : 'Despesa'}</td>
          <td>${Number(tx.amount || 0).toFixed(2).replace('.', ',')}</td>
          <td>${catName}</td>
          <td>${tx.is_settled ? 'Sim' : 'Não'}</td>
        </tr>
      `;
    });

    excelTable += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTable], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ManaCost_${formattedMonth.replace(/\s+/g, '_').toLowerCase()}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 2. Exportação / Envio Resumido para o WhatsApp
  const shareWhatsApp = () => {
    const text = `📊 *Fechamento Financeiro - ManaCost*\n` +
      `🗓 *Competência:* ${formattedMonth}\n\n` +
      `🟢 *Entradas:* R$ ${totalIncome.toFixed(2).replace('.', ',')}\n` +
      `🔴 *Saídas:* R$ ${totalExpense.toFixed(2).replace('.', ',')}\n` +
      `💰 *Saldo Final:* R$ ${currentBalance.toFixed(2).replace('.', ',')}\n\n` +
      `🎯 *Execução Orçamentária:*\n` +
      `• *Necessidades:* R$ ${spentNeeds.toFixed(2).replace('.', ',')} / R$ ${budgetNeeds.toFixed(2).replace('.', ',')}\n` +
      `• *Desejos & Lazer:* R$ ${spentWants.toFixed(2).replace('.', ',')} / R$ ${budgetWants.toFixed(2).replace('.', ',')}\n` +
      `• *Reserva:* R$ ${spentSavings.toFixed(2).replace('.', ',')} / R$ ${budgetSavings.toFixed(2).replace('.', ',')}\n\n` +
      `📋 *Total de Lançamentos:* ${rawTransactions.length}\n` +
      `_Enviado via ManaCost App_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // 3. Exportação em CSV tradicional
  const exportCSV = () => {
    if (rawTransactions.length === 0) {
      alert('Não existem lançamentos para exportar neste mês.');
      return;
    }

    const headers = ['Data', 'Descricao', 'Tipo', 'Valor', 'Categoria', 'Liquidado'];
    const rows = rawTransactions.map((tx) => [
      tx.date || '',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.type === 'income' ? 'Receita' : 'Despesa',
      Number(tx.amount || 0).toFixed(2),
      `"${((Array.isArray(tx.categories) ? tx.categories[0]?.name : tx.categories?.name) || 'Geral').replace(/"/g, '""')}"`,
      tx.is_settled ? 'Sim' : 'Nao',
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extrato_${formattedMonth.replace(/\s+/g, '_').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderProgressBar = (spent: number, budget: number, colorHex: string) => {
    const ratio = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    return (
      <div className="w-full h-1.5 bg-[#0B0F19] rounded-full overflow-hidden mt-1.5">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${ratio}%`, backgroundColor: colorHex }} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0B0F19] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#131927]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <PieChart size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Relatórios & Auditoria</h3>
              <p className="text-[10px] text-slate-400">Competência de {formattedMonth}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-xs text-slate-400">
            <Loader2 size={16} className="animate-spin text-emerald-400" />
            A consolidar métricas financeiras...
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Cards de Saldo */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#131927] p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Entradas
                </span>
                <span className="text-sm font-black text-emerald-400 mt-1 block">
                  +R$ {totalIncome.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="bg-[#131927] p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Saídas
                </span>
                <span className="text-sm font-black text-rose-400 mt-1 block">
                  -R$ {totalExpense.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="bg-[#131927] p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Saldo Líquido
                </span>
                <span
                  className={`text-sm font-black mt-1 block ${
                    currentBalance >= 0 ? 'text-slate-100' : 'text-rose-400'
                  }`}
                >
                  R$ {currentBalance.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Secção de Regra Orçamentária */}
            <div className="bg-[#131927] p-4 rounded-xl border border-white/5 space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {budgetRules.useFixed
                    ? 'Metas em R$ Fixos'
                    : `Regra ${budgetRules.needsPct} • ${budgetRules.wantsPct} • ${budgetRules.savingsPct}`}
                </span>
                <span className="text-[10px] text-slate-500">
                  Base: R$ {totalIncome.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Necessidades */}
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Necessidades</span>
                  <span className="text-slate-200 font-bold">
                    R$ {spentNeeds.toFixed(2).replace('.', ',')}{' '}
                    <span className="text-slate-500 font-normal">
                      / R$ {budgetNeeds.toFixed(2).replace('.', ',')}
                    </span>
                  </span>
                </div>
                {renderProgressBar(spentNeeds, budgetNeeds, '#38BDF8')}
              </div>

              {/* Desejos */}
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Desejos & Lazer</span>
                  <span className="text-slate-200 font-bold">
                    R$ {spentWants.toFixed(2).replace('.', ',')}{' '}
                    <span className="text-slate-500 font-normal">
                      / R$ {budgetWants.toFixed(2).replace('.', ',')}
                    </span>
                  </span>
                </div>
                {renderProgressBar(spentWants, budgetWants, '#F59E0B')}
              </div>

              {/* Reserva */}
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Reserva & Investimentos</span>
                  <span className="text-slate-200 font-bold">
                    R$ {spentSavings.toFixed(2).replace('.', ',')}{' '}
                    <span className="text-slate-500 font-normal">
                      / R$ {budgetSavings.toFixed(2).replace('.', ',')}
                    </span>
                  </span>
                </div>
                {renderProgressBar(spentSavings, budgetSavings, '#10B981')}
              </div>
            </div>

            {/* Painel de Exportações */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Opções de Exportação
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 transition"
                >
                  <MessageSquareShare size={14} />
                  WhatsApp
                </button>

                <button
                  onClick={exportExcel}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition"
                >
                  <FileSpreadsheet size={14} />
                  Excel (.xls)
                </button>

                <button
                  onClick={exportCSV}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#131927] border border-white/10 text-slate-300 hover:bg-slate-800 transition"
                >
                  <Download size={14} />
                  CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};