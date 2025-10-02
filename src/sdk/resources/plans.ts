import { AxiosInstance } from 'axios';
import { Plan, ApiResponse } from '../../types/index';

export class PlansResource {
  private httpClient: AxiosInstance;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
  }

  async create(planData: {
    name: string;
    price: number;
    currency?: string;
    interval: 'monthly' | 'yearly' | 'weekly' | 'daily' | 'month' | 'year' | 'week' | 'day';
    description?: string;
    features?: string[];
    intervalCount?: number;
    trialDays?: number;
    metadata?: Record<string, any>;
  }): Promise<Plan> {
    const response = await this.httpClient.post<ApiResponse<Plan>>('/plans', {
      ...planData,
      currency: planData.currency || 'USD'
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create plan');
    }
    return response.data.data;
  }

  async get(planId: string): Promise<Plan> {
    const response = await this.httpClient.get<ApiResponse<Plan>>(`/plans/${planId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Plan not found');
    }
    return response.data.data;
  }

  async list(options?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    tier?: string;
  }): Promise<Plan[]> {
    const params: Record<string, any> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.active !== undefined) params.active = options.active;
    if (options?.tier) params.tier = options.tier;

    const response = await this.httpClient.get<ApiResponse<Plan[]>>('/plans', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to list plans');
    }
    return response.data.data;
  }

  async update(planId: string, updates: Partial<{
    name: string;
    description: string;
    features: string[];
    price: number;
    currency: string;
    interval: 'monthly' | 'yearly' | 'weekly' | 'daily' | 'month' | 'year' | 'week' | 'day';
    active: boolean;
    intervalCount: number;
    trialDays: number;
    metadata: Record<string, any>;
  }>): Promise<Plan> {
    const response = await this.httpClient.put<ApiResponse<Plan>>(`/plans/${planId}`, updates);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update plan');
    }
    return response.data.data;
  }

  async delete(planId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.httpClient.delete<ApiResponse<unknown>>(`/plans/${planId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete plan');
    }
    return { success: true, message: response.data.message || 'Plan deleted successfully' };
  }

  async getStats(): Promise<{ total: number; active: number; inactive: number }> {
    const plans = await this.list();
    const total = plans.length;
    const active = plans.filter(p => p.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }

  async search(query: string, options?: { limit?: number; currency?: string; interval?: string }): Promise<Plan[]> {
    const allPlans = await this.list();
    const filteredPlans = allPlans.filter(plan =>
      plan.name.toLowerCase().includes(query.toLowerCase()) ||
      (plan.description && plan.description.toLowerCase().includes(query.toLowerCase())) ||
      (plan.metadata?.tier && String(plan.metadata.tier).toLowerCase().includes(query.toLowerCase()))
    );

    let results = filteredPlans;
    if (options?.currency) results = results.filter(plan => plan.currency === options.currency);
    if (options?.interval) results = results.filter(plan => plan.interval === options.interval);
    if (options?.limit) results = results.slice(0, options.limit);
    return results;
  }
}