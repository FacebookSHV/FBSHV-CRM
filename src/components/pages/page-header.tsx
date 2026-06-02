type PageHeaderProps = {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="rounded-xl bg-[#08111f] p-4 text-white shadow-soft md:hidden">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-sky-200">
          Mobile workspace
        </div>
        <h1 className="mt-2 text-[22px] font-bold tracking-normal">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {subtitle}
        </p>
        {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
      </div>

      <div className="hidden flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700">
            Tablet và PC workspace
          </div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950 sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
