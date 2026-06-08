export interface IResearchRepository {
  getCompany(companyId: string): Promise<any | null>;
  createCompany(data: Record<string, unknown>): Promise<void>;
  updateCompanyResearch(companyId: string, data: Record<string, unknown>): Promise<void>;
}
