import { AxiosInstance } from 'axios';
import { Plan, ApiResponse, PaginatedResponse } from '../../types/index';
import { MockApiService } from '../../utils/mockApi';

export class PlansResource {
  private httpClient: AxiosInstance;
  private mockApi: MockApiService;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
    this.mockApi = MockApiService.getInstance();
  }

  /**
   * Create a new subscription plan
   */
  async create(planData: {
    name: string;
    price: number;
    currency?: string;
    interval: 'monthly' | 'yearly' | 'weekly' | 'daily';
    description?: string;
    features?: string[];
  }): Promise<Plan> {
    try {
      // For now, use mock API - this will be replaced with real API calls
      const result = await this.mockApi.createPlan({
        ...planData,
        currency: planData.currency || 'USD'
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create plan');
      }

      return result.data;
    } catch (error) {
      throw new Error(`Failed to create plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a plan by ID
   */
  async get(planId: string): Promise<Plan> {
    try {
      const result = await this.mockApi.getPlan(planId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Plan not found');
      }

      return result.data;
    } catch (error) {
      throw new Error(`Failed to get plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all plans
   */
  async list(options?: {
    page?: number;
    limit?: number;
    currency?: string;
    interval?: string;
  }): Promise<Plan[]> {
    try {
      const result = await this.mockApi.listPlans();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to list plans');
      }

      let plans = result.data;

      // Apply filters if provided
      if (options?.currency) {
        plans = plans.filter((plan: Plan) => plan.currency === options.currency);
      }

      if (options?.interval) {
        plans = plans.filter((plan: Plan) => plan.interval === options.interval);
      }

      // Apply pagination if provided
      if (options?.page && options?.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        plans = plans.slice(startIndex, endIndex);
      }

      return plans;
    } catch (error) {
      throw new Error(`Failed to list plans: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a plan (future enhancement)
   */
  async update(planId: string, updates: Partial<{
    name: string;
    description: string;
    features: string[];
  }>): Promise<Plan> {
    try {
      // Get current plan
      const currentPlan = await this.get(planId);

      // For now, just return the current plan with a warning
      // In a real implementation, this would make an API call to update the plan
      console.warn('Plan update is not yet implemented in the mock API');
      
      return {
        ...currentPlan,
        ...updates,
        updatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to update plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a plan (future enhancement)
   */
  async delete(planId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if plan exists
      await this.get(planId);

      // For now, just return success message
      // In a real implementation, this would make an API call to delete the plan
      console.warn('Plan deletion is not yet implemented in the mock API');
      
      return {
        success: true,
        message: 'Plan deletion would be processed (mock mode)'
      };
    } catch (error) {
      throw new Error(`Failed to delete plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get plan statistics (future enhancement)
   */
  async getStats(planId: string): Promise<{
    totalInvoices: number;
    totalRevenue: number;
    activeSubscriptions: number;
    conversionRate: number;
  }> {
    try {
      // Check if plan exists
      await this.get(planId);

      // Return mock statistics
      return {
        totalInvoices: Math.floor(Math.random() * 100) + 10,
        totalRevenue: Math.floor(Math.random() * 10000) + 1000,
        activeSubscriptions: Math.floor(Math.random() * 50) + 5,
        conversionRate: Math.random() * 0.3 + 0.1 // 10-40%
      };
    } catch (error) {
      throw new Error(`Failed to get plan stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search plans by name or description
   */
  async search(query: string, options?: {
    limit?: number;
    currency?: string;
    interval?: string;
  }): Promise<Plan[]> {
    try {
      const allPlans = await this.list();
      
      // Filter plans by search query
      const filteredPlans = allPlans.filter(plan => 
        plan.name.toLowerCase().includes(query.toLowerCase()) ||
        (plan.description && plan.description.toLowerCase().includes(query.toLowerCase()))
      );

      // Apply additional filters
      let results = filteredPlans;

      if (options?.currency) {
        results = results.filter(plan => plan.currency === options.currency);
      }

      if (options?.interval) {
        results = results.filter(plan => plan.interval === options.interval);
      }

      // Apply limit
      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to search plans: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}