import Image from "next/image";

const LOGO_SRC = "/lafryhi-ai-radar-logo.png";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      className={className}
      src={LOGO_SRC}
      alt="LAFRYHI AI Radar"
      width={397}
      height={346}
      priority={priority}
      unoptimized
    />
  );
}
