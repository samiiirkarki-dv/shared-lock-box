import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, Bell, LogOut, Shield, Users, Vault } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Shield },
  { to: "/vault", label: "My Vault", icon: Vault },
  { to: "/connections", label: "Connections", icon: Users },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/activity", label: "Activity", icon: Activity },
] as const;

export function AppShell({
  children,
  unread = 0,
  subtitle,
  title,
}: {
  children: ReactNode;
  unread?: number;
  subtitle?: string;
  title: string;
}) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl border border-border bg-surface">
              <Shield className="size-4 text-primary" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Keepr</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground bg-surface" }}
              >
                {item.label}
                {item.to === "/notifications" && unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="ml-auto text-muted-foreground md:ml-0"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-14">
        <div className="animate-rise">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="mt-8">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur-xl md:hidden">
        <div className="flex items-stretch justify-between px-2 py-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon className="size-5" />
              <span className={cn("truncate")}>{item.label.replace("My ", "")}</span>
              {item.to === "/notifications" && unread > 0 ? (
                <span className="absolute right-3 top-1 size-2 rounded-full bg-primary" />
              ) : null}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
