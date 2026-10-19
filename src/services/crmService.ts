import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CrmCustomer, CrmInquiry, CrmDashboardMetrics, PipelineStatus } from '../types/crm';

export class CrmService {
  public async getCustomers(): Promise<CrmCustomer[]> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase
      .from('crm_customers')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to load customers: ${error.message}`);
    }
    return data || [];
  }

  public async getInquiries(): Promise<CrmInquiry[]> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase
      .from('crm_inquiries')
      .select(`
        *,
        customer:crm_customers(*),
        quotations(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load inquiries: ${error.message}`);
    }
    return data || [];
  }

  public async createCustomer(customer: { full_name: string; email?: string; whatsapp?: string }): Promise<CrmCustomer> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase
      .from('crm_customers')
      .insert([customer])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
    return data;
  }

  public async updateCustomer(id: string, customer: { full_name?: string; email?: string; whatsapp?: string }): Promise<CrmCustomer> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase
      .from('crm_customers')
      .update(customer)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
    return data;
  }

  public async createInquiry(inquiry: {
    customer_id: string;
    experience_interest: string;
    arrival_date?: string;
    departure_date?: string;
    travelers_count?: number;
    inquiry_source?: string;
    pipeline_status?: PipelineStatus;
    follow_up_date?: string;
    internal_notes?: string;
  }): Promise<CrmInquiry> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase
      .from('crm_inquiries')
      .insert([
        {
          customer_id: inquiry.customer_id,
          experience_interest: inquiry.experience_interest || 'Guna Yala Island Overnight',
          arrival_date: inquiry.arrival_date || null,
          departure_date: inquiry.departure_date || null,
          travelers_count: inquiry.travelers_count ?? 2,
          inquiry_source: inquiry.inquiry_source || 'WhatsApp',
          pipeline_status: inquiry.pipeline_status || 'New Inquiry',
          follow_up_date: inquiry.follow_up_date || null,
          internal_notes: inquiry.internal_notes || '',
        },
      ])
      .select('*, customer:crm_customers(*)')
      .single();

    if (error) {
      throw new Error(`Failed to create inquiry: ${error.message}`);
    }
    return data;
  }

  public async updateInquiry(
    id: string,
    updates: {
      experience_interest?: string;
      arrival_date?: string | null;
      departure_date?: string | null;
      travelers_count?: number;
      inquiry_source?: string;
      pipeline_status?: PipelineStatus;
      follow_up_date?: string | null;
      internal_notes?: string;
    }
  ): Promise<CrmInquiry> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase
      .from('crm_inquiries')
      .update(updates)
      .eq('id', id)
      .select('*, customer:crm_customers(*), quotations(*)')
      .single();

    if (error) {
      throw new Error(`Failed to update inquiry: ${error.message}`);
    }
    return data;
  }

  public async getDashboardMetrics(): Promise<CrmDashboardMetrics> {
    if (!isSupabaseConfigured || !supabase) {
      return { newInquiries: 0, toQuote: 0, followUpsDue: 0, confirmedBookings: 0 };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const [newRes, quoteRes, followRes, confirmedRes] = await Promise.all([
      supabase.from('crm_inquiries').select('*', { count: 'exact', head: true }).eq('pipeline_status', 'New Inquiry'),
      supabase.from('crm_inquiries').select('*', { count: 'exact', head: true }).eq('pipeline_status', 'To Quote'),
      supabase
        .from('crm_inquiries')
        .select('*', { count: 'exact', head: true })
        .not('pipeline_status', 'in', '("Completed","Lost","Cancelled")')
        .lte('follow_up_date', todayStr),
      supabase.from('crm_inquiries').select('*', { count: 'exact', head: true }).eq('pipeline_status', 'Confirmed'),
    ]);

    return {
      newInquiries: newRes.count || 0,
      toQuote: quoteRes.count || 0,
      followUpsDue: followRes.count || 0,
      confirmedBookings: confirmedRes.count || 0,
    };
  }

  public async linkQuotationToInquiry(quotationId: string, inquiryId: string | null): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase
      .from('quotations')
      .update({ inquiry_id: inquiryId })
      .eq('id', quotationId);

    if (error) {
      throw new Error(`Failed to link quotation to inquiry: ${error.message}`);
    }
  }
}

export const crmService = new CrmService();
