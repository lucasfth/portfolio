import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  index?: string;
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeading({
  index,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mb-12", className)}>
      <div className="flex items-center gap-4">
        {index && (
          <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {index}
          </span>
        )}
        <h2 data-terminal-heading className="font-heading text-4xl tracking-tight sm:text-5xl">
          {title}
        </h2>
      </div>
      {description && (
        <p data-terminal-heading className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="hairline-top mt-8 w-full" />
    </div>
  );
}
