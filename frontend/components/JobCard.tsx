import Link from 'next/link';
import type { Job } from '@/lib/api';
import { SalaryBadge } from '@/components/SalaryBadge';
import { slugify, formatDate } from '@/lib/utils';

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const slug = slugify(job.jobTitle);
  const href = `/jobs/${job.jobId}/${slug}`;

  return (
    <Link
      href={href}
      className="block group bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900 group-hover:text-brand-600 truncate transition-colors">
            {job.jobTitle}
          </h2>
          <p className="mt-0.5 text-sm text-gray-600 truncate">
            {job.employerName}
          </p>
        </div>
        <SalaryBadge min={job.minimumSalary} max={job.maximumSalary} compact size="sm" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          {job.locationName}
        </span>
        {job.datePosted && (
          <span>Posted {formatDate(job.datePosted)}</span>
        )}
      </div>
    </Link>
  );
}
