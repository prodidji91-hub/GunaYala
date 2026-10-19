export type PipelineStatus =
  | 'New Inquiry'
  | 'To Quote'
  | 'Quotation Sent'
  | 'Follow Up'
  | 'Confirmed'
  | 'Completed'
  | 'Lost'
  | 'Cancelled';

export interface CrmCustomer {
  id: string;
  full_name: string;
  email?: string;
  whatsapp?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CrmInquiry {
  id: string;
  customer_id: string;
  experience_interest: string;
  arrival_date?: string;
  departure_date?: string;
  travelers_count: number;
  inquiry_source: string;
  pipeline_status: PipelineStatus;
  follow_up_date?: string;
  last_contact_date?: string;
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
  customer?: CrmCustomer;
  quotations?: any[];
}

export interface CrmDashboardMetrics {
  newInquiries: number;
  toQuote: number;
  followUpsDue: number;
  confirmedBookings: number;
}
