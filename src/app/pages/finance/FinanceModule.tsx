// src/app/pages/finance/FinanceModule.tsx
// Comprehensive Enterprise Finance, Invoicing, Payments, AR Ageing & Ledger Suite (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  PhoneCall,
  Clock,
  Receipt,
  FileCheck,
  ShieldCheck,
  DollarSign,
  Plus,
} from 'lucide-react';
import { FinanceOverview } from './FinanceOverview.tsx';
import { InvoiceListView } from './InvoiceListView.tsx';
import { PaymentListView } from './PaymentListView.tsx';
import { CollectionsView } from './CollectionsView.tsx';
import { AgeingAndLedgerView } from './AgeingAndLedgerView.tsx';
import { ExpenseListView } from './ExpenseListView.tsx';
import { CreditDebitNotesView } from './CreditDebitNotesView.tsx';

import { InvoiceDetailModal } from './InvoiceDetailModal.tsx';
import { CreateInvoiceModal } from './CreateInvoiceModal.tsx';
import { RecordPaymentModal } from './RecordPaymentModal.tsx';
import { AllocatePaymentModal } from './AllocatePaymentModal.tsx';
import { CustomerLedgerModal } from './CustomerLedgerModal.tsx';
import { LogCollectionActivityModal } from './LogCollectionActivityModal.tsx';
import { CreateExpenseModal } from './CreateExpenseModal.tsx';
import { CreateCreditDebitNoteModal } from './CreateCreditDebitNoteModal.tsx';

import type { Invoice, Payment, CollectionTask, CustomerType } from '../../../types/finance.ts';

interface FinanceModuleProps {
  initialTab?: string;
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({ initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Modal states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState<boolean>(false);

  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState<boolean>(false);

  const [paymentToRecordForInvoice, setPaymentToRecordForInvoice] = useState<Invoice | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState<boolean>(false);

  const [selectedPaymentForAlloc, setSelectedPaymentForAlloc] = useState<Payment | null>(null);
  const [isAllocatePaymentOpen, setIsAllocatePaymentOpen] = useState<boolean>(false);

  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<{
    id: string;
    type: CustomerType;
    name: string;
  } | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState<boolean>(false);

  const [selectedCollectionTask, setSelectedCollectionTask] = useState<CollectionTask | null>(null);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState<boolean>(false);

  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState<boolean>(false);

  const [creditDebitModalType, setCreditDebitModalType] = useState<'credit' | 'debit' | null>(null);

  // Sync initial tab if props change
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleViewInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setIsInvoiceDetailOpen(true);
  };

  const handleRecordPaymentForInvoice = (invoice: Invoice) => {
    setPaymentToRecordForInvoice(invoice);
    setIsRecordPaymentOpen(true);
  };

  const handleOpenLedger = (customerId: string, customerType: CustomerType, customerName: string) => {
    setSelectedLedgerCustomer({ id: customerId, type: customerType, name: customerName });
    setIsLedgerModalOpen(true);
  };

  const handleLogActivity = (task: CollectionTask) => {
    setSelectedCollectionTask(task);
    setIsLogActivityOpen(true);
  };

  const handleAllocatePayment = (payment: Payment) => {
    setSelectedPaymentForAlloc(payment);
    setIsAllocatePaymentOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Finance Overview
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          GST Tax Invoices
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'payments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payments & Receipts
        </button>

        <button
          onClick={() => setActiveTab('outstanding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'outstanding'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          AR Aging & Ledgers
        </button>

        <button
          onClick={() => setActiveTab('collections')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'collections'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          Collections & Dunning
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'expenses'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          OPEX & AP Payables
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'notes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Credit & Debit Notes
        </button>
      </div>

      {/* Main Tab Render */}
      {activeTab === 'overview' && (
        <FinanceOverview
          onNavigateTab={setActiveTab}
          onCreateInvoice={() => setIsCreateInvoiceOpen(true)}
          onRecordPayment={() => {
            setPaymentToRecordForInvoice(null);
            setIsRecordPaymentOpen(true);
          }}
          onCreateExpense={() => setIsCreateExpenseOpen(true)}
          onViewInvoiceDetail={handleViewInvoice}
        />
      )}

      {activeTab === 'invoices' && (
        <InvoiceListView
          onCreateInvoice={() => setIsCreateInvoiceOpen(true)}
          onViewInvoice={handleViewInvoice}
          onRecordPayment={handleRecordPaymentForInvoice}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentListView
          onRecordPayment={() => {
            setPaymentToRecordForInvoice(null);
            setIsRecordPaymentOpen(true);
          }}
          onAllocatePayment={handleAllocatePayment}
        />
      )}

      {activeTab === 'outstanding' && (
        <AgeingAndLedgerView onOpenLedger={handleOpenLedger} />
      )}

      {activeTab === 'collections' && (
        <CollectionsView
          onLogActivity={handleLogActivity}
          onOpenLedger={handleOpenLedger}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpenseListView onCreateExpense={() => setIsCreateExpenseOpen(true)} />
      )}

      {activeTab === 'notes' && (
        <CreditDebitNotesView onIssueNote={(type) => setCreditDebitModalType(type)} />
      )}

      {/* Modals */}
      {isInvoiceDetailOpen && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          isOpen={isInvoiceDetailOpen}
          onClose={() => setIsInvoiceDetailOpen(false)}
          onInvoiceUpdated={() => {}}
          onRecordPayment={handleRecordPaymentForInvoice}
        />
      )}

      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          isOpen={isCreateInvoiceOpen}
          onClose={() => setIsCreateInvoiceOpen(false)}
          onInvoiceCreated={(newInv) => {
            setSelectedInvoiceId(newInv.id);
            setIsInvoiceDetailOpen(true);
          }}
        />
      )}

      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          initialInvoice={paymentToRecordForInvoice}
          onPaymentRecorded={() => {
            setActiveTab('payments');
          }}
        />
      )}

      {isAllocatePaymentOpen && (
        <AllocatePaymentModal
          payment={selectedPaymentForAlloc}
          isOpen={isAllocatePaymentOpen}
          onClose={() => setIsAllocatePaymentOpen(false)}
          onAllocated={() => {
            // refresh
          }}
        />
      )}

      {isLedgerModalOpen && selectedLedgerCustomer && (
        <CustomerLedgerModal
          customerId={selectedLedgerCustomer.id}
          customerType={selectedLedgerCustomer.type}
          customerName={selectedLedgerCustomer.name}
          isOpen={isLedgerModalOpen}
          onClose={() => setIsLedgerModalOpen(false)}
        />
      )}

      {isLogActivityOpen && (
        <LogCollectionActivityModal
          collection={selectedCollectionTask}
          isOpen={isLogActivityOpen}
          onClose={() => setIsLogActivityOpen(false)}
          onActivityLogged={() => {}}
        />
      )}

      {isCreateExpenseOpen && (
        <CreateExpenseModal
          isOpen={isCreateExpenseOpen}
          onClose={() => setIsCreateExpenseOpen(false)}
          onExpenseCreated={() => {
            setActiveTab('expenses');
          }}
        />
      )}

      {creditDebitModalType && (
        <CreateCreditDebitNoteModal
          noteType={creditDebitModalType}
          isOpen={!!creditDebitModalType}
          onClose={() => setCreditDebitModalType(null)}
          onCreated={() => {}}
        />
      )}
    </div>
  );
};
