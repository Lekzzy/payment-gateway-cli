import { AxiosInstance } from 'axios';
import { Refund, Invoice, ApiResponse } from '../../types/index';

export class RefundsResource {
  private httpClient: AxiosInstance;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
  }

  /**
   * Create a refund for an invoice
   */
  async create(refundData: {
    invoiceId: string;
    amount?: number; // If not provided, refunds full amount
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<Refund> {
    try {
      const payload: Record<string, any> = {
        invoiceId: refundData.invoiceId,
        amount: refundData.amount,
        reason: refundData.reason,
        metadata: refundData.metadata
      };

      const response = await this.httpClient.post<ApiResponse<Refund>>('/refunds', payload);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to create refund');
      }
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to create refund: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a refund by ID
   */
  async get(refundId: string): Promise<Refund> {
    try {
      const response = await this.httpClient.get<ApiResponse<Refund>>(`/refunds/${refundId}`);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Refund not found');
      }
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to get refund: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List refunds
   */
  async list(options?: {
    page?: number;
    limit?: number;
    status?: Refund['status'];
    invoiceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Refund[]> {
    try {
      const params: Record<string, any> = {};
      if (options?.limit !== undefined) params.limit = options.limit;
      if (options?.page !== undefined) params.offset = options.page && options.limit ? (options.page - 1) * options.limit : undefined;
      if (options?.status) params.status = options.status;
      if (options?.invoiceId) params.invoiceId = options.invoiceId;

      const response = await this.httpClient.get<ApiResponse<Refund[]>>('/refunds', { params });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to list refunds');
      }

      let refunds = response.data.data;

      // Apply date filters client-side if provided
      if (options?.startDate) {
        refunds = refunds.filter((refund: Refund) => new Date(refund.createdAt) >= options.startDate!);
      }

      if (options?.endDate) {
        refunds = refunds.filter((refund: Refund) => new Date(refund.createdAt) <= options.endDate!);
      }

      return refunds;
    } catch (error) {
      throw new Error(`Failed to list refunds: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get refunds for a specific invoice
   */
  async getByInvoice(invoiceId: string): Promise<Refund[]> {
    try {
      return await this.list({ invoiceId });
    } catch (error) {
      throw new Error(`Failed to get refunds for invoice: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get refund status
   */
  async getStatus(refundId: string): Promise<{
    id: string;
    status: Refund['status'];
    lastUpdated: Date;
  }> {
    try {
      const refund = await this.get(refundId);

      return {
        id: refund.id,
        status: refund.status,
        lastUpdated: typeof refund.updatedAt === 'string' ? new Date(refund.updatedAt) : refund.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to get refund status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mark refund as completed (for testing purposes)
   */
  async markAsCompleted(refundId: string): Promise<Refund> {
    try {
      const response = await this.httpClient.put<ApiResponse<Refund>>(`/refunds/${refundId}`, { status: 'completed' });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update refund');
      }
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to mark refund as completed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cancel a pending refund
   */
  async cancel(refundId: string, reason?: string): Promise<Refund> {
    try {
      const response = await this.httpClient.put<ApiResponse<Refund>>(`/refunds/${refundId}`, { status: 'failed' });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to cancel refund');
      }
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to cancel refund: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get refund statistics
   */
  async getStats(options?: {
    startDate?: Date;
    endDate?: Date;
    invoiceId?: string;
  }): Promise<{
    totalRefunds: number;
    totalAmount: number;
    completedRefunds: number;
    completedAmount: number;
    pendingRefunds: number;
    pendingAmount: number;
    failedRefunds: number;
    averageRefundAmount: number;
  }> {
    try {
      const refunds = await this.list({
        startDate: options?.startDate,
        endDate: options?.endDate,
        invoiceId: options?.invoiceId
      });

      const stats = {
        totalRefunds: refunds.length,
        totalAmount: refunds.reduce((sum, refund) => sum + refund.amount, 0),
        completedRefunds: refunds.filter(refund => refund.status === 'completed').length,
        completedAmount: refunds.filter(refund => refund.status === 'completed').reduce((sum, refund) => sum + refund.amount, 0),
        pendingRefunds: refunds.filter(refund => refund.status === 'pending').length,
        pendingAmount: refunds.filter(refund => refund.status === 'pending').reduce((sum, refund) => sum + refund.amount, 0),
        failedRefunds: refunds.filter(refund => refund.status === 'failed').length,
        averageRefundAmount: 0
      };

      stats.averageRefundAmount = stats.totalRefunds > 0 ? stats.totalAmount / stats.totalRefunds : 0;

      return stats;
    } catch (error) {
      throw new Error(`Failed to get refund stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if an invoice can be refunded
   */
  async canRefund(invoiceId: string): Promise<boolean> {
    try {
      const invResp = await this.httpClient.get<ApiResponse<Invoice>>(`/invoices/${invoiceId}`);
      if (!invResp.data.success || !invResp.data.data) {
        return false;
      }

      const invoice = invResp.data.data;
      if (invoice.status !== 'paid') {
        return false;
      }

      const existingRefunds = await this.getByInvoice(invoiceId);
      const totalRefunded = existingRefunds
        .filter(refund => refund.status === 'completed')
        .reduce((sum, refund) => sum + refund.amount, 0);

      const maxRefundAmount = invoice.amount - totalRefunded;
      return maxRefundAmount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Search refunds
   */
  async search(query: string, options?: {
    limit?: number;
    status?: string;
    invoiceId?: string;
  }): Promise<Refund[]> {
    try {
      const allRefunds = await this.list();
      
      // Filter refunds by search query (ID, invoice ID, reason)
      const filteredRefunds = allRefunds.filter(refund => 
        refund.id.toLowerCase().includes(query.toLowerCase()) ||
        refund.invoiceId.toLowerCase().includes(query.toLowerCase()) ||
        (refund.reason && refund.reason.toLowerCase().includes(query.toLowerCase()))
      );

      // Apply additional filters
      let results = filteredRefunds;

      if (options?.status) {
        results = results.filter(refund => refund.status === options.status);
      }

      if (options?.invoiceId) {
        results = results.filter(refund => refund.invoiceId === options.invoiceId);
      }

      // Apply limit
      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to search refunds: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}