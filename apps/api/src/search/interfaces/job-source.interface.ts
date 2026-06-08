import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';

export interface IJobSource {
  readonly name: string;
  readonly channel: string;
  search(criteria: SearchCriteria): AsyncGenerator<RawJobListing>;
  validate(job: RawJobListing): Promise<JobValidationResult>;
}
