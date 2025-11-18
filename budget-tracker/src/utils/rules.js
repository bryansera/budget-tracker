// Rule-based categorization system

/**
 * Rule structure:
 * {
 *   id: string,
 *   name: string,
 *   type: 'description_contains' | 'description_starts_with' | 'description_regex' | 'amount_range' | 'merchant',
 *   pattern: string | { min: number, max: number },
 *   category: string,
 *   subcategory: string | null,
 *   confidence: number (0-1),
 *   matchCount: number,
 *   examples: string[],
 *   createdAt: string (ISO date),
 *   createdBy: 'ai' | 'user',
 *   enabled: boolean
 * }
 */

/**
 * Apply a single rule to a transaction
 */
export function applyRule(transaction, rule) {
  if (!rule.enabled) return null;

  const desc = transaction.description.toUpperCase();

  switch (rule.type) {
    case 'description_contains':
      if (desc.includes(rule.pattern.toUpperCase())) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          confidence: rule.confidence,
          ruleId: rule.id,
          ruleName: rule.name
        };
      }
      break;

    case 'description_starts_with':
      if (desc.startsWith(rule.pattern.toUpperCase())) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          confidence: rule.confidence,
          ruleId: rule.id,
          ruleName: rule.name
        };
      }
      break;

    case 'description_regex':
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(transaction.description)) {
          return {
            category: rule.category,
            subcategory: rule.subcategory,
            confidence: rule.confidence,
            ruleId: rule.id,
            ruleName: rule.name
          };
        }
      } catch (e) {
        console.error('Invalid regex pattern:', rule.pattern, e);
      }
      break;

    case 'amount_range':
      const amount = Math.abs(transaction.amount);
      if (amount >= rule.pattern.min && amount <= rule.pattern.max) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          confidence: rule.confidence,
          ruleId: rule.id,
          ruleName: rule.name
        };
      }
      break;

    case 'merchant':
      // Extract merchant name (simplified)
      const merchant = extractMerchantName(transaction.description);
      if (merchant && merchant.toUpperCase().includes(rule.pattern.toUpperCase())) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          confidence: rule.confidence,
          ruleId: rule.id,
          ruleName: rule.name
        };
      }
      break;
  }

  return null;
}

/**
 * Apply all rules to a transaction, return best match
 */
export function categorizeWithRules(transaction, rules) {
  const matches = [];

  for (const rule of rules) {
    const match = applyRule(transaction, rule);
    if (match) {
      matches.push({
        ...match,
        createdBy: rule.createdBy // Include createdBy for sorting
      });
    }
  }

  if (matches.length === 0) return null;

  // Prioritize user-created rules over AI rules, then by confidence
  matches.sort((a, b) => {
    // User rules always come first
    if (a.createdBy === 'user' && b.createdBy !== 'user') return -1;
    if (a.createdBy !== 'user' && b.createdBy === 'user') return 1;
    // If both same type, sort by confidence
    return b.confidence - a.confidence;
  });
  return matches[0];
}

/**
 * Categorize multiple transactions using rules
 */
export function categorizeTransactionsWithRules(transactions, rules) {
  return transactions.map(transaction => {
    const match = categorizeWithRules(transaction, rules);

    if (match) {
      return {
        ...transaction,
        category: match.category,
        subcategory: match.subcategory,
        ruleId: match.ruleId,
        ruleName: match.ruleName,
        confidence: match.confidence,
        categorizedBy: 'rule'
      };
    }

    return transaction;
  });
}

/**
 * Generate rules from transactions using AI
 * @param {Array} transactions - Transactions to analyze
 * @param {string} apiKey - Claude API key
 * @param {Array} existingRules - Existing rules to avoid duplicates
 * @param {Function} onProgress - Callback for progress updates (message, details)
 */
export async function generateRulesWithClaude(transactions, apiKey, existingRules = [], onProgress = null) {
  const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

  const logProgress = (message, details = {}) => {
    console.log(`[generateRulesWithClaude] ${message}`, details);
    if (onProgress) {
      onProgress(message, details);
    }
  };

  logProgress('Starting rule generation', {
    totalTransactions: transactions.length,
    existingRules: existingRules.length
  });

  // Group transactions by category to find patterns
  logProgress('Grouping transactions by category...');
  const categoryGroups = {};
  transactions.forEach(t => {
    if (t.category && t.category !== 'Uncategorized') {
      if (!categoryGroups[t.category]) {
        categoryGroups[t.category] = [];
      }
      categoryGroups[t.category].push(t);
    }
  });

  logProgress('Categorized transactions grouped', {
    categories: Object.keys(categoryGroups).length,
    breakdown: Object.entries(categoryGroups).map(([cat, txns]) => `${cat}: ${txns.length}`).join(', ')
  });

  if (Object.keys(categoryGroups).length === 0) {
    logProgress('ERROR: No categorized transactions found', {
      totalTransactions: transactions.length,
      uncategorized: transactions.filter(t => t.category === 'Uncategorized' || !t.category).length,
      categories: [...new Set(transactions.map(t => t.category))]
    });
    throw new Error('No categorized transactions found. Please categorize some transactions first (use Re-categorize All button).');
  }

  // Filter out transactions that already match existing rules (unless forced)
  logProgress('Filtering transactions already matched by existing rules...');
  const unmatchedByCategory = {};
  const ignoredTransactions = [];

  Object.entries(categoryGroups).forEach(([category, txns]) => {
    const unmatched = [];
    txns.forEach(t => {
      // Check if transaction is forced to be included
      if (t.forceRuleGeneration) {
        unmatched.push(t);
        return;
      }

      // Check if any existing rule matches this transaction
      let matchedRule = null;
      for (const rule of existingRules) {
        const match = applyRule(t, rule);
        if (match) {
          matchedRule = match;
          break;
        }
      }

      if (!matchedRule) {
        // No existing rule matches - include for rule generation
        unmatched.push(t);
      } else {
        // Already matched by existing rule - ignore
        ignoredTransactions.push({
          description: t.description,
          category: t.category,
          matchedBy: matchedRule.ruleName
        });
      }
    });

    if (unmatched.length > 0) {
      unmatchedByCategory[category] = unmatched;
    }
  });

  logProgress('Filtered transactions', {
    originalCount: transactions.length,
    ignoredCount: ignoredTransactions.length,
    unmatchedCount: Object.values(unmatchedByCategory).reduce((sum, arr) => sum + arr.length, 0),
    ignoredTransactions: ignoredTransactions.slice(0, 10).map(t => `${t.description} (${t.category})`),
    totalIgnored: ignoredTransactions.length
  });

  if (Object.keys(unmatchedByCategory).length === 0) {
    logProgress('All transactions already matched by existing rules', {
      totalIgnored: ignoredTransactions.length
    });
    return { rules: [], apiCalls: [] }; // No new rules needed
  }

  // Prepare data for AI analysis
  logProgress('Preparing data for AI analysis...');
  const categoryExamples = Object.entries(unmatchedByCategory).map(([category, txns]) => ({
    category,
    count: txns.length,
    examples: txns.slice(0, 20).map(t => ({
      description: t.description,
      amount: t.amount,
      subcategory: t.subcategory
    }))
  }));

  const existingPatterns = existingRules.map(r => ({
    type: r.type,
    pattern: r.pattern,
    category: r.category
  }));

  // Split categories into batches to avoid token limits
  const CATEGORIES_PER_BATCH = 4; // Process 4 categories at a time
  const categoryBatches = [];
  const allCategories = Object.keys(unmatchedByCategory);

  for (let i = 0; i < allCategories.length; i += CATEGORIES_PER_BATCH) {
    const batchCategories = allCategories.slice(i, i + CATEGORIES_PER_BATCH);
    const batchData = {};
    batchCategories.forEach(cat => {
      batchData[cat] = unmatchedByCategory[cat];
    });
    categoryBatches.push(batchData);
  }

  logProgress('Split into batches', {
    totalCategories: allCategories.length,
    batchCount: categoryBatches.length,
    categoriesPerBatch: CATEGORIES_PER_BATCH
  });

  // Use Anthropic SDK instead of fetch to avoid CORS issues
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for browser usage
  });

  // Process each batch and collect all rules
  const allGeneratedRules = [];
  const apiCalls = []; // Store all API requests and responses

  for (let batchIndex = 0; batchIndex < categoryBatches.length; batchIndex++) {
    const batch = categoryBatches[batchIndex];
    const batchCategories = Object.keys(batch);
    const batchCategoryExamples = Object.entries(batch).map(([category, txns]) => ({
      category,
      count: txns.length,
      examples: txns.slice(0, 20).map(t => ({
        description: t.description,
        amount: t.amount,
        subcategory: t.subcategory
      }))
    }));

    // Calculate suggested rule count for this batch (8 rules per category)
    const batchRuleCount = batchCategories.length * 8;

    logProgress(`Processing batch ${batchIndex + 1}/${categoryBatches.length}`, {
      categories: batchCategories.join(', '),
      suggestedRuleCount: batchRuleCount
    });

    const prompt = `You are a financial transaction categorization expert. Analyze these categorized transactions and generate precise categorization rules.

EXISTING RULES (don't duplicate these):
${JSON.stringify(existingPatterns, null, 2)}

CATEGORIZED TRANSACTIONS:
${JSON.stringify(batchCategoryExamples, null, 2)}

Your task: Generate rules that can automatically categorize future transactions. Each rule should:
1. Match a clear pattern in transaction descriptions
2. Be specific enough to avoid false matches
3. Cover common merchants/patterns
4. Include confidence score (0-1)

Rule types you can use:
- "description_contains": Simple substring match (e.g., "STARBUCKS" → Dining/Coffee)
- "description_starts_with": Prefix match (e.g., "TST* " → Transport)
- "description_regex": Regex pattern for complex matching
- "merchant": Extract and match merchant name

Return ONLY a JSON array of rules in this exact format:
[
  {
    "name": "Starbucks Coffee",
    "type": "description_contains",
    "pattern": "STARBUCKS",
    "category": "Dining",
    "subcategory": "Coffee Shops",
    "confidence": 0.95
  }
]

Generate ${batchRuleCount} high-quality rules that cover the most common patterns in THESE CATEGORIES ONLY: ${batchCategories.join(', ')}. Try to generate multiple rules per category to capture different merchants and patterns. Focus on precision over coverage.`;

    logProgress(`Sending batch ${batchIndex + 1} to Claude API...`);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    logProgress(`Received response for batch ${batchIndex + 1}`);

    const content = response.content[0].text;

    logProgress(`Parsing batch ${batchIndex + 1} response...`, {
      responseLength: content.length,
      preview: content.substring(0, 200)
    });

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logProgress(`WARNING: No valid JSON found in batch ${batchIndex + 1} response`, {
        fullResponse: content
      });
      // Continue to next batch instead of failing completely
      continue;
    }

    let batchRules;
    try {
      batchRules = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logProgress(`ERROR: Failed to parse batch ${batchIndex + 1} JSON`, {
        error: parseError.message,
        json: jsonMatch[0].substring(0, 500)
      });
      // Continue to next batch instead of failing completely
      continue;
    }

    logProgress(`Successfully parsed batch ${batchIndex + 1}`, {
      rulesGenerated: batchRules.length
    });

    // Store API call details
    apiCalls.push({
      batchNumber: batchIndex + 1,
      categories: batchCategories,
      request: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        prompt: prompt
      },
      response: {
        fullText: content,
        rulesGenerated: batchRules.length,
        usage: response.usage || null
      }
    });

    // Add to collection
    allGeneratedRules.push(...batchRules);

    // Update existing patterns to avoid duplicates in next batches
    batchRules.forEach(rule => {
      existingPatterns.push({
        type: rule.type,
        pattern: rule.pattern,
        category: rule.category
      });
    });
  }

  logProgress('All batches processed', {
    totalRulesGenerated: allGeneratedRules.length,
    batchesProcessed: categoryBatches.length
  });

  // Add metadata to each rule
  const enrichedRules = allGeneratedRules.map((rule, index) => ({
    id: `rule_${Date.now()}_${index}`,
    ...rule,
    matchCount: 0,
    examples: [],
    createdAt: new Date().toISOString(),
    createdBy: 'ai',
    enabled: true
  }));

  logProgress('Rule generation complete!', {
    rulesGenerated: enrichedRules.length,
    categories: [...new Set(enrichedRules.map(r => r.category))].join(', ')
  });

  return {
    rules: enrichedRules,
    apiCalls: apiCalls
  };
}

/**
 * Update rule match statistics
 */
export function updateRuleStats(rules, transactions) {
  const ruleStats = {};

  // Initialize stats
  rules.forEach(rule => {
    ruleStats[rule.id] = {
      matchCount: 0,
      examples: []
    };
  });

  // Count matches
  transactions.forEach(transaction => {
    rules.forEach(rule => {
      const match = applyRule(transaction, rule);
      if (match) {
        ruleStats[rule.id].matchCount++;
        if (ruleStats[rule.id].examples.length < 5) {
          ruleStats[rule.id].examples.push(transaction.description);
        }
      }
    });
  });

  // Update rules with stats
  return rules.map(rule => ({
    ...rule,
    matchCount: ruleStats[rule.id].matchCount,
    examples: ruleStats[rule.id].examples
  }));
}

/**
 * Extract merchant name from transaction description
 */
function extractMerchantName(description) {
  // Remove common prefixes and suffixes
  let merchant = description
    .replace(/^(POS|DEBIT|CREDIT|CARD|ATM)\s+/i, '')
    .replace(/\s+#\d+/g, '')
    .replace(/\s+\d{4,}/g, '')
    .trim();

  // Take first part before location info
  const parts = merchant.split(/\s+(?:IN|AT|ON)\s+/i);
  return parts[0].trim();
}

/**
 * Validate rule structure
 */
export function validateRule(rule) {
  const errors = [];

  if (!rule.name || typeof rule.name !== 'string') {
    errors.push('Rule must have a name');
  }

  if (!['description_contains', 'description_starts_with', 'description_regex', 'amount_range', 'merchant'].includes(rule.type)) {
    errors.push('Invalid rule type');
  }

  if (rule.type === 'amount_range') {
    if (!rule.pattern || typeof rule.pattern.min !== 'number' || typeof rule.pattern.max !== 'number') {
      errors.push('amount_range rules must have pattern.min and pattern.max');
    }
  } else if (!rule.pattern || typeof rule.pattern !== 'string') {
    errors.push('Rule must have a pattern');
  }

  if (!rule.category || typeof rule.category !== 'string') {
    errors.push('Rule must have a category');
  }

  if (typeof rule.confidence !== 'number' || rule.confidence < 0 || rule.confidence > 1) {
    errors.push('Confidence must be a number between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Export rules to JSON string for Google Sheets
 */
export function exportRulesToJSON(rules) {
  return JSON.stringify(rules, null, 2);
}

/**
 * Import rules from JSON string
 */
export function importRulesFromJSON(jsonString) {
  try {
    const rules = JSON.parse(jsonString);
    if (!Array.isArray(rules)) {
      throw new Error('Rules must be an array');
    }

    // Validate each rule
    const validatedRules = [];
    const errors = [];

    rules.forEach((rule, index) => {
      const validation = validateRule(rule);
      if (validation.valid) {
        validatedRules.push(rule);
      } else {
        errors.push({ index, errors: validation.errors });
      }
    });

    return {
      rules: validatedRules,
      errors,
      success: errors.length === 0
    };
  } catch (e) {
    return {
      rules: [],
      errors: [{ message: e.message }],
      success: false
    };
  }
}
