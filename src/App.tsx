import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider, useAccount } from './context/AccountContext';
import { AuthScreen } from './components/AuthScreen';
import { JoinAccountScreen } from './components/JoinAccountScreen';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { ExpenseModal } from './components/ExpenseModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Expense } from './types';
import { Users, Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { account, accountLoading, joinAccountByCode } = useAccount();

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'transactions' | 'analytics' | 'settings'>('dashboard');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Check URL query parameters for ?join=CODE
  useEffect(() => {
    if (user && !account) {
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');
      if (joinCode) {
        joinAccountByCode(joinCode).then((success) => {
          if (success) {
            // Clean URL query
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
      }
    }
  }, [user, account, joinAccountByCode]);

  // Loading spinner
  if (authLoading || (user && accountLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg mb-4 animate-pulse">
          <Users className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Restoring DuoSpend session...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <AuthScreen />;
  }

  // Signed in, but no shared account connected yet
  if (!account) {
    return <JoinAccountScreen />;
  }

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-app transition-colors">
      <OfflineIndicator />

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAddExpense={handleOpenAddExpense}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            onOpenAddExpense={handleOpenAddExpense}
            onNavigateToTransactions={() => setCurrentTab('transactions')}
            onEditExpense={handleEditExpense}
          />
        )}

        {currentTab === 'transactions' && (
          <Transactions
            onOpenAddExpense={handleOpenAddExpense}
            onEditExpense={handleEditExpense}
          />
        )}

        {currentTab === 'analytics' && <Analytics />}

        {currentTab === 'settings' && <Settings />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAddExpense={handleOpenAddExpense}
      />

      {/* Expense Modal (Add / Edit) */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        editingExpense={editingExpense}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AccountProvider>
          <AppContent />
        </AccountProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
