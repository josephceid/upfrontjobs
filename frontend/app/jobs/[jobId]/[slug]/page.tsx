import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getJob, listJobs } from '@/lib/api';
import { SalaryBadge } from '@/components/SalaryBadge';
import { slugify, formatDate, formatSalary } from '@/lib/utils';

export const revalidate = 21600; // 6 hours

interface PageProps {
  params: Promise<{ jobId: string; slug: string }>;
}

export async function generateStaticParams() {
  try {
    const { jobs } = await listJobs({ pageSize: 100, page: 1 });
    return jobs.map((job) => ({
      jobId: job.jobId,
      slug: slugify(job.jobTitle),
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) return {};

  const minK = Math.round(job.minimumSalary / 1000);
  const maxK = Math.round(job.maximumSalary / 1000);
  const title = `${job.jobTitle} at ${job.employerName} — £${minK}k to £${maxK}k`;

  return {
    title,
    description: `${job.jobTitle} at ${job.employerName} in ${job.locationName}. Salary: £${minK}k – £${maxK}k per year. Apply via Reed.`,
    openGraph: {
      title,
      description: `${job.jobTitle} in ${job.locationName} — salary ${formatSalary(job.minimumSalary)} to ${formatSalary(job.maximumSalary)}`,
      type: 'article',
    },
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) notFound();

  const minK = Math.round(job.minimumSalary / 1000);
  const maxK = Math.round(job.maximumSalary / 1000);

  // JSON-LD structured data (schema.org/JobPosting)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.jobTitle,
    description: job.jobDescription,
    datePosted: job.datePosted,
    validThrough: job.expirationDate,
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.locationName,
        addressCountry: 'GB',
      },
    },
    hiringOrganization: {
      '@type': 'Organization',
      name: job.employerName,
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: job.currency || 'GBP',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.minimumSalary,
        maxValue: job.maximumSalary,
        unitText: 'YEAR',
      },
    },
    url: `https://upfrontjobs.co.uk/jobs/${job.jobId}/${slugify(job.jobTitle)}`,
    sameAs: job.jobUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600 transition-colors">
            Jobs
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{job.jobTitle}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {job.jobTitle}
              </h1>
              <p className="mt-1 text-lg text-gray-600">{job.employerName}</p>
            </div>
            <SalaryBadge
              min={job.minimumSalary}
              max={job.maximumSalary}
              size="lg"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              {job.locationName}
            </span>
            {job.datePosted && (
              <span>Posted {formatDate(job.datePosted)}</span>
            )}
            {job.expirationDate && (
              <span>Closes {formatDate(job.expirationDate)}</span>
            )}
          </div>

          {/* Salary breakdown */}
          <div className="mt-6 p-4 bg-salary-50 rounded-lg border border-salary-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-salary-700 mb-1">
              Salary range
            </p>
            <p className="text-2xl font-bold text-salary-700">
              {formatSalary(job.minimumSalary)} – {formatSalary(job.maximumSalary)}
            </p>
            <p className="text-xs text-salary-600 mt-0.5">
              £{minK}k – £{maxK}k per year
            </p>
          </div>

          {/* Apply CTA */}
          <div className="mt-6">
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
            >
              Apply on Reed
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job description</h2>
          <div
            className="prose prose-sm prose-gray max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: job.jobDescription }}
          />
        </div>

        {/* Back link */}
        <div className="mt-6">
          <Link
            href="/"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            ← Back to all jobs
          </Link>
        </div>
      </div>
    </>
  );
}
