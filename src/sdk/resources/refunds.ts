import { AxiosInstance } from 'axios';
import { Refund, Invoice, ApiResponse } from '../../types/index';
import { MockApiService } from '../../utils/mockApi';

export class RefundsResource {
  private httpClient: AxiosInstance;
  private mockApi: MockApiService;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
    this.mockApi = MockApiService.getInstance();
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
      const result = await this.mockApi.createRefund(refundData.invoiceId, refundData.reason);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create refund');
      }

      return result.data;
    } catch (error) {
      throw new Error(`Failed to create refund: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a refund by ID
   */
  async get(refundId: string): Promise<Refund> {
    try {
      const result = await this.mockApi.getRefund(refundId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Refund not found');
      }

      return result.data;
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
    status?: 'pending' | 'completed' | 'failed';
    invoiceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Refund[]> {
    try {
      const result = await this.mockApi.listRefunds();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to list refunds');
      }

      let refunds = result.data;

      // Apply filters if provided
      if (options?.status) {
        refunds = refunds.filter((refund: Refund) => refund.status === options.status);
      }

      if (options?.invoiceId) {
        refunds = refunds.filter((refund: Refund) => refund.invoiceId === options.invoiceId);
      }

      if (options?.startDate) {
        refunds = refunds.filter((refund: Refund) => 
          new Date(refund.createdAt) >= options.startDate!
        );
      }

      if (options?.endDate) {
        refunds = refunds.filter((refund: Refund) => 
          new Date(refund.createdAt) <= options.endDate!
        );
      }

      // Apply pagination if provided
      if (options?.page && options?.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        refunds = refunds.slice(startIndex, endIndex);
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
    status: 'pending' | 'completed' | 'failed';
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
      // Get current refund
      const refund = await this.get(refundId);

      if (refund.status !== 'pending') {
        throw new Error('Can only mark pending refunds as completed');
      }

      // For now, just update status to completed
      // In a real implementation, this would make an API call
      const updatedRefund: Refund = {
        ...refund,
        status: 'completed',
        processedAt: new Date(),
        updatedAt: new Date()
      };

      console.warn('Refund completion is simulated in mock mode');
      return updatedRefund;
    } catch (error) {
      throw new Error(`Failed to mark refund as completed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cancel a pending refund
   */
  async cancel(refundId: string, reason?: string): Promise<Refund> {
    try {
      // Get current refund
      const refund = await this.get(refundId);

      if (refund.status !== 'pending') {
        throw new Error('Can only cancel pending refunds');
      }

      // For now, just update status to failed
      // In a real implementation, this would make an API call
      const updatedRefund: Refund = {
        ...refund,
        status: 'failed',
        updatedAt: new Date(),
        metadata: {
          ...refund.metadata,
          cancelReason: reason || 'Cancelled by user'
        }
      };

      console.warn('Refund cancellation is simulated in mock mode');
      return updatedRefund;
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
  async canRefund(invoiceId: string): Promise<{
    canRefund: boolean;
    reason?: string;
    maxRefundAmount?: number;
    existingRefunds?: Refund[];
  }> {
    try {
      // Get the invoice
      const invoiceResult = await this.mockApi.getInvoice(invoiceId);
      if (!invoiceResult.success || !invoiceResult.data) {
        return {
          canRefund: false,
          reason: 'Invoice not found'
        };
      }

      const invoice = invoiceResult.data;

      // Check if invoice is paid
      if (invoice.status !== 'paid') {
        return {
          canRefund: false,
          reason: 'Invoice must be paid to be refunded'
        };
      }

      // Get existing refunds for this invoice
      const existingRefunds = await this.getByInvoice(invoiceId);
      const totalRefunded = existingRefunds
        .filter(refund => refund.status === 'completed')
        .reduce((sum, refund) => sum + refund.amount, 0);

      const maxRefundAmount = invoice.amount - totalRefunded;

      if (maxRefundAmount <= 0) {
        return {
          canRefund: false,
          reason: 'Invoice has already been fully refunded',
          maxRefundAmount: 0,
          existingRefunds
        };
      }

      return {
        canRefund: true,
        maxRefundAmount,
        existingRefunds
      };
    } catch (error) {
      return {
        canRefund: false,
        reason: `Error checking refund eligibility: ${error instanceof Error ? error.message : String(error)}`
      };
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