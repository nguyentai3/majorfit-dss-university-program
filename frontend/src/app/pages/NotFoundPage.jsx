import { Link } from 'react-router-dom';

export function NotFoundPage() {
    return (
        <div className="min-h-screen grid place-items-center bg-slate-950 px-4 text-center">
            <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/40">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">404</p>
                <h1 className="mt-4 text-4xl font-bold text-white">Page Not Found</h1>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                    The link you followed is no longer valid or the page has been moved.
                </p>
                <Link
                    to="/"
                    className="mt-8 inline-flex items-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
