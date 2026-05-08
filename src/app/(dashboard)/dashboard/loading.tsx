export default function DashboardLoading() {
  return (
    <div className="mx-auto grid max-w-7xl gap-5">
      <div className="h-0.5 overflow-hidden rounded-full bg-primary/10">
        <div className="h-full w-1/2 animate-[route-progress_1.1s_ease-in-out_infinite] bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
      </div>
      <div className="grid gap-4">
        <div className="h-12 rounded-lg border bg-card/70" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 rounded-lg border bg-card/70" />
          <div className="h-32 rounded-lg border bg-card/70" />
          <div className="h-32 rounded-lg border bg-card/70" />
        </div>
        <div className="h-72 rounded-lg border bg-card/70" />
      </div>
    </div>
  );
}
