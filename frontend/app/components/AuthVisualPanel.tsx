import Link from "next/link";

type AuthVisualPanelProps = {
  quote: string;
  author?: string;
};

export default function AuthVisualPanel({ quote, author = "— Capstone · Kelompok 19" }: AuthVisualPanelProps) {
  return (
    <div className="relative flex h-full flex-col bg-[#0a0a0a]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-12 pt-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-6 bg-[#faf7f2]" />
          <span className="text-[14px] font-bold uppercase tracking-[0.7px] text-[#faf7f2]">
            Lumen
          </span>
        </Link>
      </div>

      {/* Quote — vertically centered */}
      <div className="flex flex-1 flex-col justify-center px-12">
        <blockquote className="max-w-[480px]">
          <p className="text-[24px] font-medium leading-[33.6px] tracking-[-0.48px] text-[#faf7f2]">
            {quote}
          </p>
          <footer className="mt-6 text-[11px] uppercase tracking-[1.1px] text-[#bfbfbf]">
            {author}
          </footer>
        </blockquote>
      </div>

      {/* Build info */}
      <div className="px-12 pb-12">
        <p className="text-[11px] leading-[15.4px] text-[#bfbfbf]">
          v 0.1 BUILD 2026
          <br />
          TELKOM UNIVERSITY
        </p>
      </div>
    </div>
  );
}
