export function EmployeeAvatar({
  nome,
  cognome,
  foto_url,
  size = 48,
}: {
  nome: string;
  cognome: string;
  foto_url?: string | null;
  size?: number;
}) {
  const initials = `${nome[0] ?? ""}${cognome[0] ?? ""}`.toUpperCase();
  if (foto_url) {
    return (
      <img
        src={foto_url}
        alt={`${nome} ${cognome}`}
        className="rounded-full object-cover ring-2 ring-border"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-hero text-primary-foreground font-semibold flex items-center justify-center ring-2 ring-border"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
