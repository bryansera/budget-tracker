import { categorizeTransactionBasic } from './categorization';

export function parseCSV(content, filename) {
  const transactions = [];
  const lines = content.split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }
  
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/['"]/g, ''));
  
  // Try to detect column indices
  const dateIndex = headers.findIndex(h => h.includes('date'));
  const descIndex = headers.findIndex(h => h.includes('description') || h.includes('merchant') || h.includes('name'));
  const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('credit'));
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with potential commas in quoted fields
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const cleanParts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));
    
    if (cleanParts.length < 3) continue;
    
    let date, description, amount;
    
    // Use detected indices if available
    if (dateIndex !== -1 && descIndex !== -1 && amountIndex !== -1) {
      date = cleanParts[dateIndex];
      description = cleanParts[descIndex];
      amount = parseFloat(cleanParts[amountIndex].replace(/[^0-9.-]/g, ''));
    } else {
      // Fallback to positional parsing
      date = cleanParts[0];
      description = cleanParts[1] || cleanParts[2] || 'Unknown';
      
      // Try to find amount (usually last column with numbers)
      let foundAmount = false;
      for (let j = cleanParts.length - 1; j >= 0; j--) {
        const parsed = parseFloat(cleanParts[j].replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) {
          amount = parsed;
          foundAmount = true;
          break;
        }
      }
      
      if (!foundAmount) continue;
    }
    
    // Validate date format (basic check)
    if (!date || date.length < 6) continue;
    
    // Validate amount
    if (isNaN(amount)) continue;
    
    const { category, subcategory } = categorizeTransactionBasic(description);

    transactions.push({
      id: `${date}-${description}-${amount}-${i}`,
      date,
      description: description || 'Unknown Transaction',
      amount,
      category,
      subcategory,
      source: filename,
      aiCategorized: false
    });
  }
  
  if (transactions.length === 0) {
    throw new Error('No valid transactions found in CSV file');
  }
  
  return transactions;
}

export function exportToCSV(transactions) {
  const headers = ['Date', 'Description', 'Amount', 'Category', 'Subcategory', 'Source', 'AI Categorized', 'AI Reason'];
  const rows = transactions.map(t => [
    t.date,
    `"${t.description}"`,
    t.amount,
    t.category,
    t.subcategory || '',
    t.source,
    t.aiCategorized ? 'Yes' : 'No',
    t.aiReason ? `"${t.aiReason.replace(/"/g, '""')}"` : '' // Escape quotes in reason
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `budget-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
