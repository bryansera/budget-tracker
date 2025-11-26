import { categorizeTransactionBasic } from './categorization';

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // MM/DD/YYYY or M/D/YYYY format
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM-DD-YYYY format
  const dashMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, month, day, year] = dashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try to parse with Date object as fallback
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  // Return original if can't parse
  return cleaned;
}

/**
 * Generate a unique hash for deduplication
 */
function generateTransactionHash(date, description, amount) {
  const normalizedDate = normalizeDate(date);
  const normalizedDesc = description.toLowerCase().trim();
  const normalizedAmount = Math.abs(parseFloat(amount)).toFixed(2);
  return `${normalizedDate}|${normalizedDesc}|${normalizedAmount}`;
}

export function parseCSV(content, filename) {
  const transactions = [];
  const seenHashes = new Set();
  const lines = content.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/['"]/g, ''));

  // Try to detect column indices
  const dateIndex = headers.findIndex(h => h.includes('date'));
  const descIndex = headers.findIndex(h => h.includes('description') || h.includes('merchant') || h.includes('name'));
  const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('credit'));

  // Look for reference/transaction ID columns
  const refIndex = headers.findIndex(h =>
    h.includes('reference') || h.includes('ref') || h.includes('transaction id') ||
    h.includes('trans id') || h.includes('confirmation') || h.includes('check') ||
    h.includes('id') && !h.includes('card')
  );

  console.log('[parseCSV] Detected columns:', {
    headers,
    dateIndex,
    descIndex,
    amountIndex,
    refIndex,
    refHeader: refIndex !== -1 ? headers[refIndex] : null
  });

  let duplicateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with potential commas in quoted fields
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const cleanParts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));

    if (cleanParts.length < 3) continue;

    let date, description, amount, referenceId;

    // Use detected indices if available
    if (dateIndex !== -1 && descIndex !== -1 && amountIndex !== -1) {
      date = cleanParts[dateIndex];
      description = cleanParts[descIndex];
      amount = parseFloat(cleanParts[amountIndex].replace(/[^0-9.-]/g, ''));
      if (refIndex !== -1) {
        referenceId = cleanParts[refIndex]?.trim() || null;
      }
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

    // Normalize the date
    const normalizedDate = normalizeDate(date);

    // Generate hash for deduplication
    const hash = referenceId
      ? `ref:${referenceId}`
      : generateTransactionHash(normalizedDate, description, amount);

    // Skip duplicates
    if (seenHashes.has(hash)) {
      duplicateCount++;
      continue;
    }
    seenHashes.add(hash);

    const { category, subcategory } = categorizeTransactionBasic(description);

    transactions.push({
      id: referenceId || `${normalizedDate}-${description}-${amount}-${i}`,
      referenceId: referenceId || null,
      date: normalizedDate,
      description: description || 'Unknown Transaction',
      amount,
      category,
      subcategory,
      source: filename,
      aiCategorized: false
    });
  }

  if (duplicateCount > 0) {
    console.log(`[parseCSV] Skipped ${duplicateCount} duplicate transactions`);
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in CSV file');
  }

  return { transactions, duplicateCount };
}

export function exportToCSV(transactions) {
  const headers = ['Date', 'Description', 'Amount', 'Category', 'Subcategory', 'Source', 'AI Categorized', 'AI Reason', 'Reference ID'];
  const rows = transactions.map(t => [
    t.date,
    `"${t.description}"`,
    t.amount,
    t.category,
    t.subcategory || '',
    t.source,
    t.aiCategorized ? 'Yes' : 'No',
    t.aiReason ? `"${t.aiReason.replace(/"/g, '""')}"` : '', // Escape quotes in reason
    t.referenceId || ''
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
