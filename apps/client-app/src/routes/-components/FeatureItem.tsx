import { Check } from "lucide-react";

interface FeatureItemProps {
  title: string;
  description: string;
}

export function FeatureItem({ title, description }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50">
        <Check className="size-5 text-primary-600" />
      </div>
      <div>
        <p className="font-semibold text-text">{title}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
