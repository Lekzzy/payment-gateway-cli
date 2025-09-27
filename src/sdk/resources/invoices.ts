import { AxiosInstance } from 'axios';
import { Invoice, ApiResponse, PaginatedResponse } from '../../types/index';
import { MockApiService } from '../../utils/mockApi';

export class InvoicesResource {
  private httpClient: AxiosInstance;
  private mockApi: MockApiService;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
    this.mockApi = MockApiService.getInstance();
  }

  /**
   * Create a new invoice
   */
  async create(invoiceData: {
    planId: string;
    wallet: string;
    customerEmail?: string;
    customAmount?: number;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<Invoice> {
    try {
      const result = await this.mockApi.createInvoice(invoiceData);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create invoice');
      }

      return result.data;
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get an invoice by ID
   */
  async get(invoiceId: string): Promise<Invoice> {
    try {
      const result = await this.mockApi.getInvoice(invoiceId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Invoice not found');
      }

      return result.data;
    } catch (error) {
      throw new Error(`Failed to get invoice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List invoices
   */
  async list(options?: {
    page?: number;
    limit?: number;
    status?: 'unpaid' | 'processing' | 'paid' | 'failed' | 'expired';
    planId?: string;
    wallet?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Invoice[]> {
    try {
      const result = await this.mockApi.listInvoices();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to list invoices');
      }

      let invoices = result.data;

      // Apply filters if provided
      if (options?.status) {
        invoices = invoices.filter((invoice: Invoice) => invoice.status === options.status);
      }

      if (options?.planId) {
        invoices = invoices.filter((invoice: Invoice) => invoice.planId === options.planId);
      }

      if (options?.wallet) {
        invoices = invoices.filter((invoice: Invoice) => invoice.wallet === options.wallet);
      }

      if (options?.startDate) {
        invoices = invoices.filter((invoice: Invoice) => 
          new Date(invoice.createdAt) >= options.startDate!
        );
      }

      if (options?.endDate) {
        invoices = invoices.filter((invoice: Invoice) => 
          new Date(invoice.createdAt) <= options.endDate!
        );
      }

      // Apply pagination if provided
      if (options?.page && options?.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        invoices = invoices.slice(startIndex, endIndex);
      }

      return invoices;
    } catch (error) {
      throw new Error(`Failed to list invoices: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get invoice status
   */
  async getStatus(invoiceId: string): Promise<{
    id: string;
    status: 'unpaid' | 'processing' | 'paid' | 'failed' | 'expired';
    lastUpdated: Date;
    transactionHash?: string;
  }> {
    try {
      const invoice = await this.get(invoiceId);

      return {
        id: invoice.id,
        status: invoice.status as 'unpaid' | 'processing' | 'paid' | 'failed' | 'expired',
        lastUpdated: new Date(invoice.updatedAt),
        transactionHash: invoice.metadata?.transactionHash as string | undefined
      };
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
    status: 'unpaid' | 'processing' | 'paid' | 'failed' | 'expired';
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
        if (targetStatus && status.status === targetStatus) {
          return { ...status, timedOut: false };
        }

        // If status is final (not unpaid or processing), return
        if (status.status === 'paid' || status.status === 'failed' || status.status === 'expired') {
          return { ...status, timedOut: false };
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        // If we can't get status, wait and try again
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    // Timeout reached, get final status
    try {
      const finalStatus = await this.getStatus(invoiceId);
      return { ...finalStatus, timedOut: true };
    } catch (error) {
      throw new Error(`Failed to poll invoice status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mark invoice as paid (for testing purposes)
   */
  async markAsPaid(invoiceId: string, transactionHash?: string): Promise<Invoice> {
    try {
      const result = await this.mockApi.markInvoiceAsPaid(invoiceId, transactionHash);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to mark invoice as paid');
      }

      return result.data;
    } catch (error) {
      throw new Error(`Failed to mark invoice as paid: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cancel an invoice
   */
  async cancel(invoiceId: string, reason?: string): Promise<Invoice> {
    try {
      // Get current invoice
      const invoice = await this.get(invoiceId);

      if (invoice.status === 'paid') {
        throw new Error('Cannot cancel a paid invoice');
      }

      // For now, just update status to cancelled
      // In a real implementation, this would make an API call
      const updatedInvoice: Invoice = {
        ...invoice,
        status: 'cancelled',
        updatedAt: new Date(),
        metadata: {
          ...invoice.metadata,
          cancelReason: reason || 'Cancelled by user'
        }
      };

      console.warn('Invoice cancellation is simulated in mock mode');
      return updatedInvoice;
    } catch (error) {
      throw new Error(`Failed to cancel invoice: ${error instanceof Error ? error.message : String(error)}`);
    }
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