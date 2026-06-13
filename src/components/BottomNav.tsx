import { Link } from "@tanstack/react-router";
import { Users, Trophy, LogOut, Building2 } from "lucide-react";
import { clearSession } from "@/lib/employee-session";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-card">
      <div className="max-w-md mx-auto grid grid-cols-4">
        <Link
          to="/vota"
          className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          activeProps={{ className: "text-primary" }}
        >
          <Users className="size-5" />
          Colleghi
        </Link>
        <Link
          to="/vota-azienda"
          className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          activeProps={{ className: "text-primary" }}
        >
          <Building2 className="size-5" />
          Azienda
        </Link>
        <Link
          to="/classifiche"
          className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          activeProps={{ className: "text-primary" }}
        >
          <Trophy className="size-5" />
          Classifiche
        </Link>
        <button
          onClick={() => {
            clearSession();
            window.location.href = "/";
          }}
          className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="size-5" />
          Esci
        </button>
      </div>
    </nav>
  );
}

