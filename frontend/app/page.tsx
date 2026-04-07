import { Suspense } from 'react';
import type { Metadata } from 'next';
import { listJobs } from '@/lib/api';
import { JobCard } from '@/components/JobCard';
import { JobSearch } from '@/components/JobSearch';

export const revalidate = 21600; // 6 hours

export const metadata: Metadata = {
  title: 'Upfront Jobs — Find jobs that show you the salary',
  description:
    'Browse thousands of UK jobs — every listing shows a real salary range. No "competitive salary" vagueness.',
};

interface PageProps {
  searchParams: Promise<{
    keyword?: string;
    location?: string;
    minSalary?: string;
    page?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { jobs, total } = await listJobs({
    keyword: params.keyword,
    location: params.location,
    minSalary: params.minSalary ? Number(params.minSalary) : undefined,
    page,
    pageSize: 20,
  });

  const hasFilters = params.keyword || params.location || params.minSalary;

  return (
    <>
      {/* Hero */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Every salary,{' '}
            <span className="text-brand-600">upfront.</span>
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl">
            We only show job listings that declare a real salary range.
            No&nbsp;&ldquo;competitive salary&rdquo;, no guessing games.
          </p>
          <div className="mt-6">
            <Suspense>
              <JobSearch />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {hasFilters
              ? `${total.toLocaleString()} job${total !== 1 ? 's' : ''} found`
              : `${total.toLocaleString()} salary-declared job${total !== 1 ? 's' : ''}`}
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">No jobs found</p>
            <p className="mt-1 text-sm">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <JobCard key={job.jobId} job={job} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-8 flex justify-center gap-2">
            {page > 1 && (
              <a
                href={buildPageUrl(params, page - 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Previous
              </a>
            )}
            {page * 20 < total && (
              <a
                href={buildPageUrl(params, page + 1)}
                className="px-4 py-2 rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                Next
              </a>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function buildPageUrl(
  params: { keyword?: string; location?: string; minSalary?: string },
  page: number,
): string {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.location) qs.set('location', params.location);
  if (params.minSalary) qs.set('minSalary', params.minSalary);
  qs.set('page', String(page));
  return `/?${qs.toString()}`;
}
