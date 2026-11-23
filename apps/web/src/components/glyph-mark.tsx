import Image from "next/image";

export function GlyphMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span aria-hidden="true" className={`relative inline-block ${className ?? ""}`}>
      <Image
        alt=""
        className="object-contain"
        fill
        priority={priority}
        sizes="64px"
        src="/brand/glyph-on-dark.png"
      />
    </span>
  );
}
