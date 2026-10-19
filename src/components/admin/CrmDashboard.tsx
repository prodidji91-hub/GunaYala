import React, { useState, useEffect } from 'react';
import { crmService } from '../../services/crmService';
import { CrmCustomer, CrmInquiry, CrmDashboardMetrics, PipelineStatus } from '../../types/crm';
import { Quotation } from '../../types/quotation';
import {
  Users,
  FileQuestion,
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  Phone,
  Mail,
  MessageSquare,
  ArrowLeft,
  Globe,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
  Clock,
  Check,
  ChevronRight,
  X,
  Edit,
  Eye,
} from 'lucide-react';

interface CrmDashboardProps {
  onBackToList: () => void;
  onCreateQuotationForInquiry: (inquiry: CrmInquiry, customer: CrmCustomer) => void;
  onEditQuotation: (quotation: Quotation) => void;
  onPreviewQuotation: (quotation: Quotation) => void;
  language?: 'en' | 'es';
}

const PIPELINE_STATUSES: PipelineStatus[] = [
  'New Inquiry',
  'To Quote',
  'Quotation Sent',
  'Follow Up',
  'Confirmed',
  'Completed',
  'Lost',
  'Cancelled',
];

export const CrmDashboard: React.FC<CrmDashboardProps> = ({
  onBackToList,
  onCreateQuotationForInquiry,
  onEditQuotation,
  onPreviewQuotation,
  language = 'en',
}) => {
  const [isEs, setIsEs] = useState<boolean>(language === 'es');
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [inquiries, setInquiries] = useState<CrmInquiry[]>([]);
  const [metrics, setMetrics] = useState<CrmDashboardMetrics>({
    newInquiries: 0,
    toQuote: 0,
    followUpsDue: 0,
    confirmedBookings: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Tab: 'inquiries' | 'customers' | 'followups'
  const [activeTab, setActiveTab] = useState<'inquiries' | 'customers' | 'followups'>('inquiries');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Customer Profile Modal
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<CrmCustomer | null>(null);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CrmCustomer | null>(null);
  const [customerForm, setCustomerForm] = useState({ full_name: '', email: '', whatsapp: '' });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [showInquiryModal, setShowInquiryModal] = useState<boolean>(false);
  const [selectedCustomerIdForInquiry, setSelectedCustomerIdForInquiry] = useState<string>('');
  const [inquiryForm, setInquiryForm] = useState({
    experience_interest: 'Guna Yala Island Overnight',
    arrival_date: '',
    departure_date: '',
    travelers_count: 2,
    inquiry_source: 'WhatsApp',
    pipeline_status: 'New Inquiry' as PipelineStatus,
    follow_up_date: '',
    internal_notes: '',
  });

  const tr = (en: string, es: string) => (isEs ? es : en);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [custData, inqData, metData] = await Promise.all([
        crmService.getCustomers(),
        crmService.getInquiries(),
        crmService.getDashboardMetrics(),
      ]);
      setCustomers(custData);
      setInquiries(inqData);
      setMetrics(metData);
    } catch (err: any) {
      console.error('Error loading CRM data:', err);
      setErrorMsg(err?.message || 'Failed to load CRM records from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.full_name.trim()) return;

    if (!editingCustomer) {
      const match = customers.find(
        (c) =>
          (customerForm.email && c.email && c.email.toLowerCase() === customerForm.email.toLowerCase()) ||
          (customerForm.whatsapp && c.whatsapp && c.whatsapp === customerForm.whatsapp)
      );
      if (match && !duplicateWarning) {
        setDuplicateWarning(
          tr(
            `A customer with matching email or WhatsApp (${match.full_name}) already exists. Click Save again to proceed anyway.`,
            `Ya existe un cliente con correo o WhatsApp similar (${match.full_name}). Haga clic en Guardar de nuevo para continuar.`
          )
        );
        return;
      }
    }

    try {
      if (editingCustomer) {
        await crmService.updateCustomer(editingCustomer.id, customerForm);
        setSuccessMsg(tr('Customer updated successfully.', 'Cliente actualizado con éxito.'));
      } else {
        await crmService.createCustomer(customerForm);
        setSuccessMsg(tr('Customer created successfully.', 'Cliente creado con éxito.'));
      }
      setShowCustomerModal(false);
      setEditingCustomer(null);
      setCustomerForm({ full_name: '', email: '', whatsapp: '' });
      setDuplicateWarning(null);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save customer.');
    }
  };

  const handleSaveInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerIdForInquiry) return;

    try {
      await crmService.createInquiry({
        customer_id: selectedCustomerIdForInquiry,
        ...inquiryForm,
      });
      setShowInquiryModal(false);
      setSuccessMsg(tr('Inquiry added successfully.', 'Consulta agregada con éxito.'));
      setTimeout(() => setSuccessMsg(null), 4000);
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create inquiry.');
    }
  };

  const handleUpdateStatus = async (inquiryId: string, newStatus: PipelineStatus) => {
    try {
      await crmService.updateInquiry(inquiryId, { pipeline_status: newStatus });
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update pipeline status.');
    }
  };

  const handleUpdateFollowUp = async (inquiryId: string, dateStr: string) => {
    try {
      await crmService.updateInquiry(inquiryId, { follow_up_date: dateStr || null });
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update follow-up date.');
    }
  };

  // Filtered lists
  const filteredInquiries = inquiries.filter((inq) => {
    const matchesSearch =
      inq.experience_interest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.customer?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.customer?.whatsapp?.includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter === 'All') return true;
    if (statusFilter === 'FollowUpsDue') {
      const today = new Date().toISOString().split('T')[0];
      return inq.follow_up_date && inq.follow_up_date <= today && !['Completed', 'Lost', 'Cancelled'].includes(inq.pipeline_status);
    }
    return inq.pipeline_status === statusFilter;
  });

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.whatsapp?.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-[#0e3b2f] text-white rounded-xl p-6 sm:p-8 shadow-lg border border-[#22483d] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-[#1b4b3d] text-[#c9a96e] border border-[#2d5f50]">
              {tr('CRM Administration', 'Administración CRM')}
            </span>
            <span className="text-xs text-[#a3c9bd]">
              {tr('Customer Relationship Management', 'Gestión de Relaciones con Clientes')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#f7f2ea]">
            {tr('Customer Management', 'Gestión de Clientes')}
          </h1>
          <p className="text-xs sm:text-sm text-[#b2d6cc] mt-1 max-w-2xl">
            {tr(
              'Track leads, schedule follow-ups, manage travel inquiries, and issue quotations securely linked to Supabase.',
              'Realice un seguimiento de clientes potenciales, programe seguimientos y emita cotizaciones vinculadas a Supabase.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onBackToList}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#184437] hover:bg-[#205243] text-[#e8dbbf] font-medium text-xs rounded-lg transition-colors border border-[#2d5f50]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{tr('Back to Quotations', 'Volver a Cotizaciones')}</span>
          </button>

          <button
            onClick={() => setIsEs(!isEs)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#184437] hover:bg-[#205243] text-white font-medium text-xs rounded-lg transition-colors border border-[#2d5f50]"
          >
            <Globe className="w-4 h-4 text-[#c9a96e]" />
            <span>{isEs ? '🇪🇸 ES' : '🇬🇧 EN'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-xs text-red-950 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={loadData} className="px-3 py-1 bg-red-800 hover:bg-red-900 text-white rounded text-xs">
            Retry
          </button>
        </div>
      )}

      {/* 4 Dashboard Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#e5dec9] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#687785] uppercase tracking-wider">
              {tr('New Inquiries', 'Nuevas Consultas')}
            </p>
            <p className="text-2xl font-serif font-bold text-[#0e3b2f] mt-1">{metrics.newInquiries}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#c9a96e] border border-amber-200 flex items-center justify-center">
            <FileQuestion className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#e5dec9] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#687785] uppercase tracking-wider">
              {tr('Quotations to Prepare', 'Cotizaciones a Preparar')}
            </p>
            <p className="text-2xl font-serif font-bold text-[#0e3b2f] mt-1">{metrics.toQuote}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#0e3b2f] border border-emerald-200 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#e5dec9] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#687785] uppercase tracking-wider">
              {tr('Follow-ups Due', 'Seguimientos Pendientes')}
            </p>
            <p className="text-2xl font-serif font-bold text-amber-700 mt-1">{metrics.followUpsDue}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#e5dec9] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#687785] uppercase tracking-wider">
              {tr('Confirmed Bookings', 'Reservas Confirmadas')}
            </p>
            <p className="text-2xl font-serif font-bold text-emerald-800 mt-1">{metrics.confirmedBookings}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main CRM Content Area */}
      <div className="bg-white rounded-xl border border-[#e5dec9] shadow-sm overflow-hidden">
        {/* Navigation / Filter Bar */}
        <div className="p-4 sm:p-6 border-b border-[#e5dec9] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#faf8f5]">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => {
                setActiveTab('inquiries');
                setStatusFilter('All');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === 'inquiries' && statusFilter === 'All'
                  ? 'bg-[#0e3b2f] text-white shadow-sm'
                  : 'bg-white hover:bg-[#f0eae0] text-[#1c242c] border border-[#d8ceb9]'
              }`}
            >
              {tr('All Inquiries', 'Todas las Consultas')} ({inquiries.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('inquiries');
                setStatusFilter('FollowUpsDue');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                statusFilter === 'FollowUpsDue'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'bg-white hover:bg-[#f0eae0] text-[#1c242c] border border-[#d8ceb9]'
              }`}
            >
              {tr('Follow-ups Due', 'Seguimientos Vencidos')} ({metrics.followUpsDue})
            </button>

            <button
              onClick={() => {
                setActiveTab('customers');
                setStatusFilter('All');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === 'customers'
                  ? 'bg-[#0e3b2f] text-white shadow-sm'
                  : 'bg-white hover:bg-[#f0eae0] text-[#1c242c] border border-[#d8ceb9]'
              }`}
            >
              {tr('Customer Directory', 'Directorio de Clientes')} ({customers.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#8a98a5] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr('Search customers or inquiries...', 'Buscar clientes o consultas...')}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setEditingCustomer(null);
                setCustomerForm({ full_name: '', email: '', whatsapp: '' });
                setDuplicateWarning(null);
                setShowCustomerModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0e3b2f] hover:bg-[#154d3e] text-white font-medium text-xs rounded-lg transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4 text-[#c9a96e]" />
              <span>{tr('Add Customer', 'Agregar Cliente')}</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#0e3b2f]">
            <Loader2 className="w-8 h-8 animate-spin text-[#c9a96e] mb-3" />
            <span className="text-xs font-mono font-medium">Loading Supabase CRM records...</span>
          </div>
        ) : activeTab === 'customers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f5f1e8] text-[#0e3b2f] border-b border-[#e5dec9] font-serif uppercase tracking-wider text-[11px]">
                  <th className="p-4">{tr('Customer Name', 'Nombre del Cliente')}</th>
                  <th className="p-4">{tr('Email', 'Correo')}</th>
                  <th className="p-4">{tr('WhatsApp', 'WhatsApp')}</th>
                  <th className="p-4">{tr('Inquiries / Trips', 'Consultas / Viajes')}</th>
                  <th className="p-4 text-right">{tr('Actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eae0]">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-[#8a98a5]">
                      {tr('No customers found.', 'No se encontraron clientes.')}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const custInquiries = inquiries.filter((i) => i.customer_id === cust.id);
                    return (
                      <tr key={cust.id} className="hover:bg-[#faf8f5] transition-colors">
                        <td className="p-4 font-semibold text-[#0e3b2f] font-serif">
                          <button
                            onClick={() => setSelectedProfileCustomer(cust)}
                            className="hover:underline text-[#0e3b2f] font-serif text-left flex items-center gap-1.5"
                          >
                            <span>{cust.full_name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#c9a96e]" />
                          </button>
                        </td>
                        <td className="p-4 text-[#52606d]">{cust.email || '—'}</td>
                        <td className="p-4 text-[#52606d] font-mono">{cust.whatsapp || '—'}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                            {custInquiries.length} {tr('inquiries', 'consultas')}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedProfileCustomer(cust)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-[#0e3b2f] rounded text-[11px] border border-[#cfc7b2] transition-colors"
                          >
                            <Users className="w-3.5 h-3.5 text-[#c9a96e]" />
                            <span>{tr('Profile', 'Perfil')}</span>
                          </button>

                          {cust.whatsapp && (
                            <a
                              href={`https://wa.me/${cust.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                tr(
                                  `Hello ${cust.full_name}, greeting from Guna Yala Panama Travel. Regarding your trip inquiry:`,
                                  `Hola ${cust.full_name}, saludos de Guna Yala Panama Travel. Con respecto a su consulta de viaje:`
                                )
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          <button
                            onClick={() => {
                              setSelectedCustomerIdForInquiry(cust.id);
                              setInquiryForm({
                                experience_interest: 'Guna Yala Island Overnight',
                                arrival_date: '',
                                departure_date: '',
                                travelers_count: 2,
                                inquiry_source: 'WhatsApp',
                                pipeline_status: 'New Inquiry',
                                follow_up_date: '',
                                internal_notes: '',
                              });
                              setShowInquiryModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0e3b2f] hover:bg-[#154d3e] text-white rounded text-[11px] transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#c9a96e]" />
                            <span>{tr('Add Inquiry', 'Nueva Consulta')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f5f1e8] text-[#0e3b2f] border-b border-[#e5dec9] font-serif uppercase tracking-wider text-[11px]">
                  <th className="p-4">{tr('Customer & Contact', 'Cliente y Contacto')}</th>
                  <th className="p-4">{tr('Experience / Package', 'Experiencia / Paquete')}</th>
                  <th className="p-4">{tr('Dates & Travelers', 'Fechas y Viajeros')}</th>
                  <th className="p-4">{tr('Pipeline Status', 'Estado')}</th>
                  <th className="p-4">{tr('Linked Quotations', 'Cotizaciones Vinculadas')}</th>
                  <th className="p-4 text-right">{tr('Actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eae0]">
                {filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-[#8a98a5]">
                      {tr('No inquiries found.', 'No se encontraron consultas.')}
                    </td>
                  </tr>
                ) : (
                  filteredInquiries.map((inq) => {
                    const cust = inq.customer;
                    const linkedQuotations = inq.quotations || [];
                    const isOverdue =
                      inq.follow_up_date &&
                      inq.follow_up_date <= new Date().toISOString().split('T')[0] &&
                      !['Completed', 'Lost', 'Cancelled'].includes(inq.pipeline_status);

                    return (
                      <tr key={inq.id} className="hover:bg-[#faf8f5] transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => cust && setSelectedProfileCustomer(cust)}
                            className="font-semibold text-[#0e3b2f] font-serif hover:underline text-left block"
                          >
                            {cust?.full_name || 'Unknown Customer'}
                          </button>
                          <div className="text-[11px] text-[#687785] flex items-center gap-2 mt-0.5">
                            {cust?.email && <span>{cust.email}</span>}
                            {cust?.whatsapp && <span className="font-mono">{cust.whatsapp}</span>}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-medium text-[#1c242c]">{inq.experience_interest}</div>
                          <div className="text-[10px] text-[#8a98a5] mt-0.5">
                            {tr('Source:', 'Fuente:')} {inq.inquiry_source}
                          </div>
                        </td>

                        <td className="p-4 text-[#52606d]">
                          <div>
                            {inq.arrival_date ? `${inq.arrival_date} → ${inq.departure_date || '?'}` : tr('Dates TBD', 'Fechas por definir')}
                          </div>
                          <div className="text-[10px] text-[#8a98a5] mt-0.5">
                            {inq.travelers_count} {tr('travelers', 'viajeros')}
                          </div>
                        </td>

                        <td className="p-4">
                          <select
                            value={inq.pipeline_status}
                            onChange={(e) => handleUpdateStatus(inq.id, e.target.value as PipelineStatus)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border shadow-2xs focus:outline-none ${
                              inq.pipeline_status === 'Confirmed'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : inq.pipeline_status === 'New Inquiry'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : inq.pipeline_status === 'To Quote'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            {PIPELINE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-4">
                          {linkedQuotations.length > 0 ? (
                            <div className="space-y-1">
                              {linkedQuotations.map((q: any) => (
                                <div
                                  key={q.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-900 rounded border border-emerald-200 text-[11px]"
                                >
                                  <span className="font-mono font-bold">{q.reference || q.id}</span>
                                  <span className="text-emerald-700 font-semibold">${q.total || q.data?.total || 0}</span>
                                  <button
                                    onClick={() => cust && setSelectedProfileCustomer(cust)}
                                    className="text-emerald-900 hover:underline text-[10px] ml-1"
                                    title="View in customer profile"
                                  >
                                    (View)
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8a98a5] italic">
                              {tr('No quotes linked', 'Sin cotizaciones')}
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => cust && onCreateQuotationForInquiry(inq, cust)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0e3b2f] hover:bg-[#154d3e] text-white rounded text-[11px] font-medium transition-colors shadow-sm"
                            title="Create Quotation linked to this inquiry"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#c9a96e]" />
                            <span>{tr('Create Quote', 'Crear Cotización')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Profile Modal / Drawer */}
      {selectedProfileCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-[#e5dec9] space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0eae0]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0e3b2f] text-[#c9a96e] flex items-center justify-center font-serif font-bold text-lg">
                  {selectedProfileCustomer.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-serif font-semibold text-[#0e3b2f]">
                    {selectedProfileCustomer.full_name}
                  </h2>
                  <div className="flex items-center gap-4 text-xs text-[#52606d] mt-0.5">
                    {selectedProfileCustomer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#c9a96e]" />
                        {selectedProfileCustomer.email}
                      </span>
                    )}
                    {selectedProfileCustomer.whatsapp && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-[#c9a96e]" />
                        {selectedProfileCustomer.whatsapp}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedProfileCustomer.whatsapp && (
                  <a
                    href={`https://wa.me/${selectedProfileCustomer.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      tr(
                        `Hello ${selectedProfileCustomer.full_name}, greeting from Guna Yala Panama Travel.`,
                        `Hola ${selectedProfileCustomer.full_name}, saludos de Guna Yala Panama Travel.`
                      )
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => setSelectedProfileCustomer(null)}
                  className="p-2 text-[#8a98a5] hover:text-[#1c242c] rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Inquiries & Quotations Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-serif font-semibold text-[#0e3b2f]">
                  {tr('Associated Travel Inquiries & Linked Quotations', 'Consultas de Viaje y Cotizaciones Vinculadas')}
                </h3>

                <button
                  onClick={() => {
                    setSelectedCustomerIdForInquiry(selectedProfileCustomer.id);
                    setInquiryForm({
                      experience_interest: 'Guna Yala Island Overnight',
                      arrival_date: '',
                      departure_date: '',
                      travelers_count: 2,
                      inquiry_source: 'WhatsApp',
                      pipeline_status: 'New Inquiry',
                      follow_up_date: '',
                      internal_notes: '',
                    });
                    setShowInquiryModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0e3b2f] hover:bg-[#154d3e] text-white rounded text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#c9a96e]" />
                  <span>{tr('Add New Inquiry', 'Nueva Consulta')}</span>
                </button>
              </div>

              <div className="space-y-4">
                {inquiries.filter((i) => i.customer_id === selectedProfileCustomer.id).length === 0 ? (
                  <div className="p-8 bg-[#faf8f5] rounded-xl border border-[#e5dec9] text-center text-xs text-[#8a98a5]">
                    {tr('No inquiries recorded for this customer.', 'No hay consultas registradas para este cliente.')}
                  </div>
                ) : (
                  inquiries
                    .filter((i) => i.customer_id === selectedProfileCustomer.id)
                    .map((inq) => {
                      const linkedQuotes = inq.quotations || [];
                      return (
                        <div
                          key={inq.id}
                          className="bg-[#faf8f5] rounded-xl p-5 border border-[#e5dec9] space-y-4 shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5dec9]">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-semibold text-[#0e3b2f] text-sm">
                                  {inq.experience_interest}
                                </span>
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                    inq.pipeline_status === 'Confirmed'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-amber-100 text-amber-900 border-amber-300'
                                  }`}
                                >
                                  {inq.pipeline_status}
                                </span>
                              </div>
                              <p className="text-xs text-[#52606d] mt-1">
                                {tr('Dates:', 'Fechas:')}{' '}
                                {inq.arrival_date ? `${inq.arrival_date} → ${inq.departure_date || '?'}` : tr('TBD', 'Por definir')} |{' '}
                                {inq.travelers_count} {tr('travelers', 'viajeros')} | {tr('Source:', 'Fuente:')}{' '}
                                {inq.inquiry_source}
                              </p>
                            </div>

                            <button
                              onClick={() => onCreateQuotationForInquiry(inq, selectedProfileCustomer)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0e3b2f] hover:bg-[#154d3e] text-white rounded-lg text-xs font-medium transition-colors shadow-sm shrink-0"
                            >
                              <FileText className="w-4 h-4 text-[#c9a96e]" />
                              <span>{tr('Create Quotation', 'Crear Cotización')}</span>
                            </button>
                          </div>

                          {/* Linked Quotations sub-list */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-[#0e3b2f] uppercase tracking-wider">
                              {tr('Linked Quotations', 'Cotizaciones Vinculadas')} ({linkedQuotes.length})
                            </h4>

                            {linkedQuotes.length === 0 ? (
                              <p className="text-xs text-[#8a98a5] italic">
                                {tr('No quotations linked yet.', 'No hay cotizaciones vinculadas todavía.')}
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {linkedQuotes.map((q: any) => {
                                  const fullQuote: Quotation = q.data || q;
                                  return (
                                    <div
                                      key={q.id}
                                      className="bg-white p-3.5 rounded-lg border border-[#d8ceb9] shadow-2xs flex items-center justify-between gap-3"
                                    >
                                      <div>
                                        <div className="font-mono font-bold text-[#0e3b2f] text-xs">
                                          {fullQuote.reference || q.reference}
                                        </div>
                                        <div className="text-[11px] text-[#52606d]">
                                          {tr('Status:', 'Estado:')} {fullQuote.status || q.status} |{' '}
                                          <span className="font-semibold text-emerald-800">
                                            ${fullQuote.total || q.total || 0}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => {
                                            setSelectedProfileCustomer(null);
                                            onPreviewQuotation(fullQuote);
                                          }}
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
                                          title="View / Preview PDF"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedProfileCustomer(null);
                                            onEditQuotation(fullQuote);
                                          }}
                                          className="p-1.5 bg-[#0e3b2f] hover:bg-[#154d3e] text-white rounded text-xs"
                                          title="Edit Quotation"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#e5dec9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0eae0]">
              <h3 className="text-base font-serif font-semibold text-[#0e3b2f]">
                {editingCustomer ? tr('Edit Customer', 'Editar Cliente') : tr('Add New Customer', 'Nuevo Cliente')}
              </h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-[#8a98a5] hover:text-[#1c242c]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              {duplicateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0e3b2f]">
                  {tr('Full Name *', 'Nombre Completo *')}
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.full_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })}
                  placeholder="e.g. Petra Gonzalez"
                  className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0e3b2f]">{tr('Email Address', 'Correo Electrónico')}</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="petra@example.com"
                  className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0e3b2f]">{tr('WhatsApp Number', 'Número de WhatsApp')}</label>
                <input
                  type="text"
                  value={customerForm.whatsapp}
                  onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
                  placeholder="+507 6000 0000"
                  className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0eae0]">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                >
                  {tr('Cancel', 'Cancelar')}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0e3b2f] hover:bg-[#154d3e] text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
                >
                  {tr('Save Customer', 'Guardar Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#e5dec9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0eae0]">
              <h3 className="text-base font-serif font-semibold text-[#0e3b2f]">
                {tr('Add Travel Inquiry / Trip', 'Nueva Consulta de Viaje')}
              </h3>
              <button onClick={() => setShowInquiryModal(false)} className="text-[#8a98a5] hover:text-[#1c242c]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInquiry} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0e3b2f]">
                  {tr('Experience / Package Interest *', 'Interés de Paquete / Experiencia *')}
                </label>
                <input
                  type="text"
                  required
                  value={inquiryForm.experience_interest}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, experience_interest: e.target.value })}
                  className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0e3b2f]">{tr('Arrival Date', 'Fecha de Llegada')}</label>
                  <input
                    type="date"
                    value={inquiryForm.arrival_date}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, arrival_date: e.target.value })}
                    className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0e3b2f]">{tr('Departure Date', 'Fecha de Salida')}</label>
                  <input
                    type="date"
                    value={inquiryForm.departure_date}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, departure_date: e.target.value })}
                    className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0e3b2f]">{tr('Travelers Count', 'Número de Viajeros')}</label>
                  <input
                    type="number"
                    min={1}
                    value={inquiryForm.travelers_count}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, travelers_count: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0e3b2f]">{tr('Inquiry Source', 'Fuente')}</label>
                  <select
                    value={inquiryForm.inquiry_source}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, inquiry_source: e.target.value })}
                    className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none bg-white"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="Website">Website</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Referral">Referral / Referido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0e3b2f]">{tr('Initial Pipeline Status', 'Estado Inicial')}</label>
                <select
                  value={inquiryForm.pipeline_status}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, pipeline_status: e.target.value as PipelineStatus })}
                  className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none bg-white"
                >
                  {PIPELINE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0e3b2f]">{tr('Follow-up Date', 'Fecha de Seguimiento')}</label>
                <input
                  type="date"
                  value={inquiryForm.follow_up_date}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, follow_up_date: e.target.value })}
                  className="w-full p-2.5 border border-[#d8ceb9] rounded-lg text-xs focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0eae0]">
                <button
                  type="button"
                  onClick={() => setShowInquiryModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                >
                  {tr('Cancel', 'Cancelar')}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0e3b2f] hover:bg-[#154d3e] text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
                >
                  {tr('Save Inquiry', 'Guardar Consulta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
