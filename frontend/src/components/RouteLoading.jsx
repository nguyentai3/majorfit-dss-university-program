export function RouteLoading({ label = 'Loading...' }) {
    return (
        <div className="min-h-screen grid place-items-center">
            <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" />
                <span>{label}</span>
            </div>
        </div>
    );
}

export default RouteLoading;
