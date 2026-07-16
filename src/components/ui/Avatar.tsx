import { cn } from "@/lib/utils";

/**
 * Avatar del DS (TAL-8/TAL-16): iniciales con color determinista por nombre.
 * El mismo nombre siempre cae en el mismo color.
 */
const COLORES = [
  "#4F46E5", // indigo (brand)
  "#7C3AED", // violet
  "#059669", // emerald
  "#D97706", // amber
  "#DC2626", // red
  "#2563EB", // blue
  "#0891B2", // cyan
  "#DB2777", // pink
];

const TAM: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-[13px]",
  lg: "h-12 w-12 text-[15px]",
};

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const color = COLORES[hash(name) % COLORES.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        TAM[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {iniciales(name)}
    </span>
  );
}
