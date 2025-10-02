import { AxiosInstance } from 'axios';
import { Invoice, ApiResponse, Plan } from '../../types/index';

export class InvoicesResource {
  private httpClient: AxiosInstance;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
  }

  /**
   * Create a new invoice
   */
  async create(invoiceData: {
    planId: string;
    amount?: number;
    currency?: string;
    wallet?: string;
    description?: string;
    dueDate?: string | Date;
    metadata?: Record<string, any>;
    customerEmail?: string;
  }): Promise<Invoice> {
    // Prepare metadata, merging any provided metadata with customerEmail if present
    const metadata = {
      ...(invoiceData.metadata || {}),
      ...(invoiceData.customerEmail ? { customerEmail: invoiceData.customerEmail } : {})
    };

    // If amount or currency not provided, fetch plan to infer values
    let amount = invoiceData.amount;
    let currency = invoiceData.currency;
    if (amount === undefined || currency === undefined) {
      const planResp = await this.httpClient.get<ApiResponse<Plan>>(`/plans/${invoiceData.planId}`);
      if (!planResp.data.success || !planResp.data.data) {
        throw new Error(planResp.data.error || 'Failed to fetch plan for invoice');
      }
      const plan = planResp.data.data;
      amount = amount !== undefined ? amount : plan.price;
      currency = currency !== undefined ? currency : plan.currency;
    }

    const payload: Record<string, any> = {
      planId: invoiceData.planId,
      amount,
      currency,
      wallet: invoiceData.wallet,
      description: invoiceData.description,
      dueDate: invoiceData.dueDate,
      metadata
    };

    const response = await this.httpClient.post<ApiResponse<Invoice>>('/invoices', payload);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create invoice');
    }
    return response.data.data;
  }

  /**
   * Get an invoice by ID
   */
  async get(invoiceId: string): Promise<Invoice> {
    const response = await this.httpClient.get<ApiResponse<Invoice>>(`/invoices/${invoiceId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Invoice not found');
    }
    return response.data.data;
  }

  /**
   * List invoices
   */
  async list(options?: {
    limit?: number;
    offset?: number;
    status?: 'pending' | 'paid' | 'cancelled' | 'overdue' | 'failed' | 'unpaid' | 'processing' | 'expired';
    planId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Invoice[]> {
    const params: Record<string, any> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.status) params.status = options.status;
    if (options?.planId) params.planId = options.planId;

    const response = await this.httpClient.get<ApiResponse<Invoice[]>>('/invoices', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to list invoices');
    }
    let invoices = response.data.data;

    // Apply date filters client-side if provided
    if (options?.startDate) {
      invoices = invoices.filter((invoice: Invoice) => new Date(invoice.createdAt) >= options.startDate!);
    }

    if (options?.endDate) {
      invoices = invoices.filter((invoice: Invoice) => new Date(invoice.createdAt) <= options.endDate!);
    }

    return invoices;
  }

  /**
   * Get invoice status
   */
  async getStatus(invoiceId: string): Promise<Invoice['status']> {
    try {
      const invoice = await this.get(invoiceId);
      return invoice.status as Invoice['status'];
    } catch (error) {
      throw new Error(`Failed to get invoice status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Poll invoice status until it changes or timeout
   */
  async pollStatus(
    invoiceId: string,
    options?: {
      timeout?: number; // milliseconds
      interval?: number; // milliseconds
      targetStatus?: 'paid' | 'failed' | 'expired';
    }
  ): Promise<{
    id: string;
    status: Invoice['status'];
    lastUpdated: Date;
    transactionHash?: string;
    timedOut: boolean;
  }> {
    const timeout = options?.timeout || 300000; // 5 minutes default
    const interval = options?.interval || 5000; // 5 seconds default
    const targetStatus = options?.targetStatus;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getStatus(invoiceId);

        // If we have a target status and it matches, return immediately
        if (targetStatus && status === targetStatus) {
          const inv = await this.get(invoiceId);
          return {
            id: inv.id,
            status: inv.status as Invoice['status'],
            lastUpdated: new Date(inv.updatedAt),
            transactionHash: inv.metadata?.transactionHash as string | undefined,
            timedOut: false
          };
        }

        // If status is final (paid, failed, expired, cancelled, overdue), return
        if (status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'overdue') {
          const inv = await this.get(invoiceId);
          return {
            id: inv.id,
            status: inv.status as Invoice['status'],
            lastUpdated: new Date(inv.updatedAt),
            transactionHash: inv.metadata?.transactionHash as string | undefined,
            timedOut: false
          };
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        // If we can't get status, wait and try again
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    // Timeout reached
    throw new Error('Timeout waiting for status');
  }

  /**
   * Mark invoice as paid (for testing purposes)
   */
  async markAsPaid(invoiceId: string, transactionHash?: string): Promise<Invoice> {
    const response = await this.httpClient.post<ApiResponse<Invoice>>(`/invoices/${invoiceId}/pay`, {
      transactionHash
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to mark invoice as paid');
    }
    return response.data.data;
  }

  /**
   * Cancel an invoice
   */
  async cancel(invoiceId: string, reason?: string): Promise<Invoice> {
    const response = await this.httpClient.post<ApiResponse<Invoice>>(`/invoices/${invoiceId}/cancel`, {
      reason
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to cancel invoice');
    }
    return response.data.data;
  }

  /**
   * Get invoice payment URL (for hosted pay link)
   */
  getPaymentUrl(invoiceId: string, baseUrl?: string): string {
    const host = baseUrl || 'https://pay.billing.test';
    return `${host}/pay/${invoiceId}`;
  }

  /**
   * Get invoice statistics
   */
  async getStats(options?: {
    startDate?: Date;
    endDate?: Date;
    planId?: string;
  }): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidInvoices: number;
    paidAmount: number;
    pendingInvoices: number;
    pendingAmount: number;
    failedInvoices: number;
    conversionRate: number;
  }> {
    try {
      const invoices = await this.list({
        startDate: options?.startDate,
        endDate: options?.endDate,
        planId: options?.planId
      });

      const stats = {
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
        paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
        paidAmount: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
        pendingInvoices: invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'processing').length,
        pendingAmount: invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'processing').reduce((sum, inv) => sum + inv.amount, 0),
        failedInvoices: invoices.filter(inv => inv.status === 'failed' || inv.status === 'cancelled').length,
        conversionRate: 0
      };

      stats.conversionRate = stats.totalInvoices > 0 ? stats.paidInvoices / stats.totalInvoices : 0;

      return stats;
    } catch (error) {
      throw new Error(`Failed to get invoice stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search invoices
   */
  async search(query: string, options?: {
    limit?: number;
    status?: string;
    planId?: string;
  }): Promise<Invoice[]> {
    try {
      const allInvoices = await this.list();
      
      // Filter invoices by search query (ID, wallet, email)
      const filteredInvoices = allInvoices.filter(invoice => 
        invoice.id.toLowerCase().includes(query.toLowerCase()) ||
        (invoice.wallet && invoice.wallet.toLowerCase().includes(query.toLowerCase())) ||
        (invoice.metadata?.customerEmail && invoice.metadata.customerEmail.toLowerCase().includes(query.toLowerCase()))
      );

      // Apply additional filters
      let results = filteredInvoices;

      if (options?.status) {
        results = results.filter(invoice => invoice.status === options.status);
      }

      if (options?.planId) {
        results = results.filter(invoice => invoice.planId === options.planId);
      }

      // Apply limit
      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to search invoices: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}