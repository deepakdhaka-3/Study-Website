export function LoadingDots() {
  return (
    <div className="flex items-center gap-2 text-sky-300">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300/80" />
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300/60 [animation-delay:150ms]" />
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300/40 [animation-delay:300ms]" />
    </div>
  );
}
