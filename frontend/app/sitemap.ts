import type { MetadataRoute } from 'next';
import { listJobs } from '@/lib/api';
import { slugify } from '@/lib/utils';

export const revalidate = 21600; // 6 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://upfrontjobs.co.uk';

  // Fetch enough jobs for the sitemap — paginate if needed.
  const pageSize = 100;
  let page = 1;
  const jobUrls: MetadataRoute.Sitemap = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { jobs, total } = await listJobs({ page, pageSize });
    for (const job of jobs) {
      jobUrls.push({
        url: `${baseUrl}/jobs/${job.jobId}/${slugify(job.jobTitle)}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
    if (page * pageSize >= total) break;
    page++;
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    ...jobUrls,
  ];
}
