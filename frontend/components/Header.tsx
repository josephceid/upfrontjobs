import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <Image
            src="/images/upfront-logo-light.svg"
            alt="Upfront Jobs"
            width={228}
            height={48}
            priority
          />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-gray-600">
          <Link
            href="/"
            className="px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Jobs
          </Link>
        </nav>
      </div>
    </header>
  );
}
