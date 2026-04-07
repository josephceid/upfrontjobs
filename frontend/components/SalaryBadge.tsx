import { formatSalaryRange } from '@/lib/utils';

interface SalaryBadgeProps {
  min: number;
  max: number;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SalaryBadge({ min, max, compact = false, size = 'md' }: SalaryBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-salary-50 text-salary-700 font-medium ring-1 ring-inset ring-salary-100 ${sizeClasses[size]}`}
    >
      {formatSalaryRange(min, max, compact)}
    </span>
  );
}
