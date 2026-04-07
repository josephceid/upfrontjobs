export interface Job {
  jobId: string;
  jobTitle: string;
  employerName: string;
  employerId: string;
  locationName: string;
  minimumSalary: number;
  maximumSalary: number;
  currency: string;
  jobDescription: string;
  jobUrl: string;
  datePosted: string;
  expirationDate: string;
  source: string;
  createdAt: number;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JobResponse {
  job: Job;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function listJobs(params: {
  keyword?: string;
  location?: string;
  minSalary?: number;
  maxSalary?: number;
  page?: number;
  pageSize?: number;
}): Promise<JobsResponse> {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.location) qs.set('location', params.location);
  if (params.minSalary) qs.set('minSalary', String(params.minSalary));
  if (params.maxSalary) qs.set('maxSalary', String(params.maxSalary));
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));

  const res = await fetch(`${API_URL}/jobs?${qs.toString()}`, {
    next: { revalidate: 21600 }, // 6 hours
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getJob(jobId: string): Promise<Job | null> {
  const res = await fetch(`${API_URL}/jobs/${jobId}`, {
    next: { revalidate: 21600 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data: JobResponse = await res.json();
  return data.job;
}
