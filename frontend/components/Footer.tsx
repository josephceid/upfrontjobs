export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} upfrontjobs.co.uk — every salary, upfront.
        </p>
        <p>
          Job listings powered by{' '}
          <a
            href="https://www.reed.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
          >
            Reed
          </a>
        </p>
      </div>
    </footer>
  );
}
