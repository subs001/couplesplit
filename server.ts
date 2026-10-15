import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Persistent JSON file storage
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const HOUSEHOLDS_FILE = path.join(DATA_DIR, 'households.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');
const SETTLEMENTS_FILE = path.join(DATA_DIR, 'settlements.json');

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

export interface Member {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface CategoryInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgLight: string;
}

export interface Household {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  categories?: CategoryInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  householdId: string;
  amount: number;
  category: string;
  paymentMethod: string;
  description: string;
  splitType: 'common' | 'split_equal' | 'split_custom' | 'personal';
  paidBy: string; // member id
  customSplit?: { [memberId: string]: number }; // percentage or amounts
  date: string; // YYYY-MM-DD
  notes?: string;
  isStarred?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  householdId: string;
  fromMember: string;
  toMember: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

// Seed initial default household and sample expenses if empty
function initializeDefaultData() {
  const households = readJsonFile<Record<string, Household>>(HOUSEHOLDS_FILE, {});
  const expenses = readJsonFile<Expense[]>(EXPENSES_FILE, []);
  const settlements = readJsonFile<Settlement[]>(SETTLEMENTS_FILE, []);

  const defaultId = 'HOME-2026';
  if (!households[defaultId]) {
    households[defaultId] = {
      id: defaultId,
      name: 'Our Shared Home',
      currency: '₹',
      members: [
        { id: 'm1', name: 'Shriya', color: '#10b981', avatar: '👩' },
        { id: 'm2', name: 'Husband', color: '#3b82f6', avatar: '👨' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeJsonFile(HOUSEHOLDS_FILE, households);
  }

  // Pre-seed some realistic expenses for current month and previous month if empty
  if (expenses.length === 0) {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');

    const sampleExpenses: Expense[] = [
      {
        id: 'exp-1',
        householdId: defaultId,
        amount: 3450,
        category: 'Groceries',
        paymentMethod: 'gpay',
        description: 'Supermarket monthly groceries & staples',
        splitType: 'common',
        paidBy: 'm1',
        date: `${curYear}-${curMonth}-02`,
        notes: 'Vegetables, milk, pulses from D-Mart',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-2',
        householdId: defaultId,
        amount: 2100,
        category: 'Electricity',
        paymentMethod: 'HDFC card',
        description: 'Monthly electricity bill',
        splitType: 'split_equal',
        paidBy: 'm2',
        date: `${curYear}-${curMonth}-04`,
        notes: 'Electricity board payment via HDFC card',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-3',
        householdId: defaultId,
        amount: 1850,
        category: 'Dining/Food',
        paymentMethod: 'Swiggy card',
        description: 'Weekend dinner & gelato',
        splitType: 'common',
        paidBy: 'm1',
        date: `${curYear}-${curMonth}-07`,
        notes: 'Swiggy dinner order discount applied',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-4',
        householdId: defaultId,
        amount: 2500,
        category: 'Fuel',
        paymentMethod: 'Axis Card',
        description: 'Car petrol tank refill',
        splitType: 'split_equal',
        paidBy: 'm2',
        date: `${curYear}-${curMonth}-09`,
        notes: 'HPCL petrol pump',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-5',
        householdId: defaultId,
        amount: 1200,
        category: 'Wifi',
        paymentMethod: 'gpay',
        description: 'High-speed broadband wifi bill',
        splitType: 'common',
        paidBy: 'm1',
        date: `${curYear}-${curMonth}-10`,
        notes: 'Monthly fiber internet plan',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-6',
        householdId: defaultId,
        amount: 649,
        category: 'Netflix',
        paymentMethod: 'HSBC card',
        description: 'Netflix 4K subscription',
        splitType: 'common',
        paidBy: 'm2',
        date: `${curYear}-${curMonth}-11`,
        notes: 'Auto-debit from HSBC card',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-7',
        householdId: defaultId,
        amount: 3000,
        category: 'Maid',
        paymentMethod: 'gpay',
        description: 'Monthly maid salary',
        splitType: 'common',
        paidBy: 'm1',
        date: `${curYear}-${curMonth}-11`,
        notes: 'Direct UPI transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-8',
        householdId: defaultId,
        amount: 850,
        category: 'RO',
        paymentMethod: 'AU card',
        description: 'RO water purifier service & filter change',
        splitType: 'common',
        paidBy: 'm2',
        date: `${curYear}-${curMonth}-11`,
        notes: 'Quarterly RO maintenance',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-9',
        householdId: defaultId,
        amount: 620,
        category: 'Pancake',
        paymentMethod: 'Swiggy card',
        description: 'Pancake cafe breakfast treat',
        splitType: 'common',
        paidBy: 'm1',
        date: `${curYear}-${curMonth}-11`,
        notes: 'Sunday pancakes with maple syrup',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-10',
        householdId: defaultId,
        amount: 3500,
        category: 'Rent',
        paymentMethod: 'Axis bank',
        description: 'House rent partial payment / advance',
        splitType: 'common',
        paidBy: 'm2',
        date: `${prevYear}-${prevMonth}-05`,
        notes: 'Direct bank transfer to owner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'exp-11',
        householdId: defaultId,
        amount: 1499,
        category: 'House things shopping',
        paymentMethod: 'amazon pay card',
        description: 'Home organizer baskets & curtains',
        splitType: 'common',
        paidBy: 'm1',
        date: `${prevYear}-${prevMonth}-18`,
        notes: 'Amazon Great Indian Festival purchase',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    writeJsonFile(EXPENSES_FILE, sampleExpenses);
  }
}

initializeDefaultData();

// --- API Routes ---

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get or Create Household
app.get('/api/household/:id', (req, res) => {
  const households = readJsonFile<Record<string, Household>>(HOUSEHOLDS_FILE, {});
  const code = req.params.id.toUpperCase();
  const household = households[code];
  if (!household) {
    return res.status(404).json({ error: 'Household not found' });
  }
  return res.json(household);
});

app.post('/api/household', (req, res) => {
  const households = readJsonFile<Record<string, Household>>(HOUSEHOLDS_FILE, {});
  let { id, name, currency, members } = req.body;

  const code = (id || `HOME-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();

  if (!households[code]) {
    households[code] = {
      id: code,
      name: name || 'Our Shared Household',
      currency: currency || '₹',
      members: members || [
        { id: 'm1', name: 'Shriya', color: '#10b981', avatar: '👩' },
        { id: 'm2', name: 'Husband', color: '#3b82f6', avatar: '👨' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeJsonFile(HOUSEHOLDS_FILE, households);
  }
  return res.json(households[code]);
});

app.put('/api/household/:id', (req, res) => {
  const households = readJsonFile<Record<string, Household>>(HOUSEHOLDS_FILE, {});
  const code = req.params.id.toUpperCase();
  if (!households[code]) {
    return res.status(404).json({ error: 'Household not found' });
  }

  const { name, currency, members, categories } = req.body;
  if (name !== undefined) households[code].name = name;
  if (currency !== undefined) households[code].currency = currency;
  if (members !== undefined) households[code].members = members;
  if (categories !== undefined) households[code].categories = categories;
  households[code].updatedAt = new Date().toISOString();

  writeJsonFile(HOUSEHOLDS_FILE, households);
  return res.json(households[code]);
});

// Expenses
app.get('/api/expenses', (req, res) => {
  const householdId = (req.query.householdId as string)?.toUpperCase() || 'HOME-2026';
  const expenses = readJsonFile<Expense[]>(EXPENSES_FILE, []);
  const filtered = expenses.filter((e) => e.householdId.toUpperCase() === householdId);
  return res.json(filtered);
});

app.post('/api/expenses', (req, res) => {
  const expenses = readJsonFile<Expense[]>(EXPENSES_FILE, []);
  const { id, householdId, amount, category, paymentMethod, description, splitType, paidBy, customSplit, date, notes, isStarred, createdAt } = req.body;

  if (!amount || !category) {
    return res.status(400).json({ error: 'Amount and Category are required' });
  }

  const newExpense: Expense = {
    id: id || `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    householdId: (householdId || 'HOME-2026').toUpperCase(),
    amount: Number(amount),
    category: category || 'Miscellaneous',
    paymentMethod: paymentMethod || 'UPI / GPay',
    description: description || '',
    splitType: splitType || 'common',
    paidBy: paidBy || 'm1',
    customSplit: customSplit || undefined,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || '',
    isStarred: isStarred !== undefined ? Boolean(isStarred) : false,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  expenses.unshift(newExpense);
  writeJsonFile(EXPENSES_FILE, expenses);
  return res.status(201).json(newExpense);
});

app.put('/api/expenses/:id', (req, res) => {
  const expenses = readJsonFile<Expense[]>(EXPENSES_FILE, []);
  const index = expenses.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  const existing = expenses[index];
  const { amount, category, paymentMethod, description, splitType, paidBy, customSplit, date, notes, isStarred } = req.body;

  expenses[index] = {
    ...existing,
    amount: amount !== undefined ? Number(amount) : existing.amount,
    category: category !== undefined ? category : existing.category,
    paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
    description: description !== undefined ? description : existing.description,
    splitType: splitType !== undefined ? splitType : existing.splitType,
    paidBy: paidBy !== undefined ? paidBy : existing.paidBy,
    customSplit: customSplit !== undefined ? customSplit : existing.customSplit,
    date: date !== undefined ? date : existing.date,
    notes: notes !== undefined ? notes : existing.notes,
    isStarred: isStarred !== undefined ? Boolean(isStarred) : existing.isStarred,
    updatedAt: new Date().toISOString(),
  };

  writeJsonFile(EXPENSES_FILE, expenses);
  return res.json(expenses[index]);
});

app.delete('/api/expenses/:id', (req, res) => {
  const expenses = readJsonFile<Expense[]>(EXPENSES_FILE, []);
  const filtered = expenses.filter((e) => e.id !== req.params.id);
  writeJsonFile(EXPENSES_FILE, filtered);
  return res.json({ success: true, id: req.params.id });
});

// Batch update expense category (e.g. when renaming or reassigning categories)
app.post('/api/expenses/batch-update-category', (req, res) => {
  const { householdId, oldCategory, newCategory } = req.body;
  if (!householdId || !oldCategory || !newCategory) {
    return res.status(400).json({ error: 'householdId, oldCategory, and newCategory are required' });
  }

  const expenses = readJsonFile<Expense[]>(EXPENSES_FILE, []);
  let updatedCount = 0;
  const targetHId = householdId.toUpperCase();

  for (const exp of expenses) {
    if (exp.householdId.toUpperCase() === targetHId && exp.category === oldCategory) {
      exp.category = newCategory;
      exp.updatedAt = new Date().toISOString();
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    writeJsonFile(EXPENSES_FILE, expenses);
  }

  return res.json({ success: true, updatedCount });
});

// Settlements
app.get('/api/settlements', (req, res) => {
  const householdId = (req.query.householdId as string)?.toUpperCase() || 'HOME-2026';
  const settlements = readJsonFile<Settlement[]>(SETTLEMENTS_FILE, []);
  const filtered = settlements.filter((s) => s.householdId.toUpperCase() === householdId);
  return res.json(filtered);
});

app.post('/api/settlements', (req, res) => {
  const settlements = readJsonFile<Settlement[]>(SETTLEMENTS_FILE, []);
  const { householdId, fromMember, toMember, amount, date, notes } = req.body;

  if (!amount || !fromMember || !toMember) {
    return res.status(400).json({ error: 'Missing required settlement fields' });
  }

  const newSettlement: Settlement = {
    id: `set-${Date.now()}`,
    householdId: (householdId || 'HOME-2026').toUpperCase(),
    fromMember,
    toMember,
    amount: Number(amount),
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  settlements.unshift(newSettlement);
  writeJsonFile(SETTLEMENTS_FILE, settlements);
  return res.status(201).json(newSettlement);
});

// Merge / Restore from Google Drive Backup
app.post('/api/sync-drive-backup', (req, res) => {
  const { household: incomingH, expenses: incomingE, settlements: incomingS } = req.body;
  if (!incomingH || !incomingH.id) {
    return res.status(400).json({ error: 'Invalid backup payload: missing household' });
  }

  const households = readJsonFile<Record<string, Household>>(HOUSEHOLDS_FILE, {});
  const expenses = readJsonFile<Expense[]>(EXPENSES_FILE, []);
  const settlements = readJsonFile<Settlement[]>(SETTLEMENTS_FILE, []);

  const code = incomingH.id.toUpperCase();

  // Merge household
  if (!households[code]) {
    households[code] = incomingH;
  } else {
    // Keep members and settings if incoming is valid
    households[code] = {
      ...households[code],
      name: incomingH.name || households[code].name,
      currency: incomingH.currency || households[code].currency,
      members: incomingH.members || households[code].members,
      categories: incomingH.categories || households[code].categories,
      updatedAt: new Date().toISOString(),
    };
  }
  writeJsonFile(HOUSEHOLDS_FILE, households);

  // Merge expenses: if expense id exists, keep latest updatedAt; otherwise add
  if (Array.isArray(incomingE)) {
    const existingMap = new Map(expenses.map((e) => [e.id, e]));
    for (const exp of incomingE) {
      if (!existingMap.has(exp.id)) {
        expenses.unshift(exp);
      } else {
        const cur = existingMap.get(exp.id)!;
        if (new Date(exp.updatedAt || 0) > new Date(cur.updatedAt || 0)) {
          const idx = expenses.findIndex((e) => e.id === exp.id);
          if (idx !== -1) expenses[idx] = exp;
        }
      }
    }
    writeJsonFile(EXPENSES_FILE, expenses);
  }

  // Merge settlements
  if (Array.isArray(incomingS)) {
    const existingSetMap = new Set(settlements.map((s) => s.id));
    for (const st of incomingS) {
      if (!existingSetMap.has(st.id)) {
        settlements.unshift(st);
      }
    }
    writeJsonFile(SETTLEMENTS_FILE, settlements);
  }

  const filteredExpenses = expenses.filter((e) => e.householdId.toUpperCase() === code);
  const filteredSettlements = settlements.filter((s) => s.householdId.toUpperCase() === code);

  return res.json({
    success: true,
    household: households[code],
    expenses: filteredExpenses,
    settlements: filteredSettlements,
  });
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CoupleSplit server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
