import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";

export function MarketingSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <PublicSectionHeading
      eyebrow={eyebrow}
      title={title}
      description={description}
    />
  );
}
