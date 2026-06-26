import { NavLink, Outlet } from "react-router-dom";
import { KanbanSquare, LayoutDashboard, ListTodo, LogOut } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/theme/ThemeToggle";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/board", label: "Board", icon: KanbanSquare },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-svh bg-muted/30">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <ListTodo className="size-5 text-primary" />
          <span className="font-semibold">Task Manager</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavLinks />
        </nav>

        {/* User + controls pinned to the bottom */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2 px-1 py-1.5">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {user ? initials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-sm leading-tight">
              <div className="truncate font-medium">{user?.name}</div>
              <div className="text-xs capitalize text-muted-foreground">
                {user?.role}
              </div>
            </div>
            <ThemeToggle />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full justify-start"
            onClick={() => logout()}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar (sidebar is hidden on small screens) */}
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4 md:hidden">
          <nav className="flex items-center gap-1 overflow-x-auto">
            <NavLinks />
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => logout()}>
              <LogOut className="size-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-clip p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
