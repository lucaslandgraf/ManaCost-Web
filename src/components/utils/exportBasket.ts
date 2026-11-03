interface BasketExportItem {
  descricao: string;
  quantidade?: number;
  valor: number;
  estabelecimento?: {
    nome?: string;
  };
}

// 1. Exportação nativa para CSV (com suporte completo a UTF-8 e acentuação no Excel)
export function exportBasketToCSV(items: BasketExportItem[], totalPrevisto: number) {
  const headers = ['Produto', 'Supermercado', 'Quantidade', 'Preço Unitário (R$)', 'Subtotal (R$)'];

  const rows = items.map((item) => {
    const qtd = item.quantidade || 1;
    const unit = Number(item.valor || 0);
    const subtotal = qtd * unit;
    const mercado = item.estabelecimento?.nome || 'Não informado';
    
    // Escapar aspas duplas para CSV válido
    const safeName = `"${item.descricao.replace(/"/g, '""')}"`;
    const safeStore = `"${mercado.replace(/"/g, '""')}"`;

    return [
      safeName,
      safeStore,
      qtd,
      unit.toFixed(2).replace('.', ','),
      subtotal.toFixed(2).replace('.', ',')
    ].join(';');
  });

  // Linha de total geral
  rows.push('');
  rows.push(`"TOTAL PREVISTO";"";"";"";"${totalPrevisto.toFixed(2).replace('.', ',')}"`);

  // Adiciona o BOM (\uFEFF) para forçar o Excel a ler como UTF-8
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `cesta_compras_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 2. Exportação para Excel (HTML Spreadsheet XML nativo que o Excel abre sem dependências)
export function exportBasketToExcel(items: BasketExportItem[], totalPrevisto: number) {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  
  const rowsHtml = items.map((item) => {
    const qtd = item.quantidade || 1;
    const unit = Number(item.valor || 0);
    const subtotal = qtd * unit;
    const mercado = item.estabelecimento?.nome || 'Não informado';

    return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.descricao}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${mercado}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${qtd}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${unit.toFixed(2).replace('.', ',')}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
      </tr>
    `;
  }).join('');

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Cesta de Compras</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      </head>
      <body>
        <h2>ManaCost - Relatório da Cesta de Compras (${dateStr})</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #10B981; color: white;">
              <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Produto</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Supermercado</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Quantidade</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Preço Unitário</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background-color: #f2f2f2; font-weight: bold;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 10px; text-align: right;">TOTAL PREVISTO:</td>
              <td style="border: 1px solid #ddd; padding: 10px; text-align: right; color: #059669;">R$ ${totalPrevisto.toFixed(2).replace('.', ',')}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `cesta_compras_${new Date().toISOString().slice(0, 10)}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}