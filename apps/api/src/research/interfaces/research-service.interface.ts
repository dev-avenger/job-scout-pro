export interface IResearchService {
  getCompanyResearch(companyId: string): Promise<unknown | null>;
  triggerResearch(companyId: string, companyName: string, userId: string): Promise<{ research: string }>;
  createCompany(data: { name: string; domain?: string; careersUrl?: string }): Promise<{ id: string }>;
}
