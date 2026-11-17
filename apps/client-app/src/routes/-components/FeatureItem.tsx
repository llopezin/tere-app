import { Check } from "lucide-react";

interface FeatureItemProps {
  title: string;
}

export function FeatureItem({ title }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50">
        <Check className="size-5 text-primary-600" />
      </div>
      <p className="font-semibold text-text">{title}</p>
    </div>
  );
}
