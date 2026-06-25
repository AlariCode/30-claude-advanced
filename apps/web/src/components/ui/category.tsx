interface CategoryProps {
  label: string
}

export function Category({ label }: CategoryProps) {
  return (
    <div className="inline-flex items-center gap-[6px] rounded-full bg-accent-soft px-[10px] py-[5px]">
      <span className="size-[7px] shrink-0 rounded-full bg-accent" />
      <span className="text-[12px] font-semibold text-accent">{label}</span>
    </div>
  )
}
