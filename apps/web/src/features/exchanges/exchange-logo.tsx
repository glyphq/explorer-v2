import { classNames } from "@/lib/format";
import { exchangeBrand, exchangeBrandName, isExchangeDelisted } from "@/lib/exchanges/brands";

function fallbackInitials(brand: string): string {
  const words = brand.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }
  return brand.slice(0, 2).toUpperCase();
}

/** Exchange symbol artwork, with a monogram fallback for brands without one. */
export function ExchangeLogo({ className, name }: { className?: string; name: string }) {
  const brandName = exchangeBrandName(name);
  const brand = exchangeBrand(name);
  if (!brand?.icon) {
    return (
      <span
        aria-label={brandName}
        className={classNames(
          "inline-flex items-center justify-center bg-surface-secondary font-semibold text-foreground text-xs",
          className,
        )}
        role="img"
      >
        {fallbackInitials(brandName)}
      </span>
    );
  }

  return (
    <span
      className={classNames("relative inline-flex items-center justify-center", className)}
      title={brandName}
    >
      <img
        alt={`${brandName} logo`}
        className="h-full w-full object-contain"
        decoding="async"
        loading="lazy"
        src={brand.icon}
      />
    </span>
  );
}

export function ExchangeListingNotice({ name }: { name: string }) {
  if (!isExchangeDelisted(name)) {
    return null;
  }
  return (
    <span className="rounded-full bg-danger/10 px-2 py-0.5 font-medium text-[10px] text-danger">
      Delisted
    </span>
  );
}

export function ExchangeLogoAvatar({ name }: { name: string }) {
  return (
    <span className="inline-flex size-28 items-center justify-center overflow-hidden rounded-full bg-surface-secondary p-5">
      <ExchangeLogo className="h-full w-full" name={name} />
    </span>
  );
}
