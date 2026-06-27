import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          <Icon className="size-4 shrink-0" />
          {!collapsed && label}
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });

  return (
    // h-svh + overflow-hidden = the shell is exactly the viewport; only <main>
    // scrolls, so the sidebar (and its pinned footer) stay fixed.
    <div className="flex h-svh overflow-hidden bg-muted/30">
      {/* Sidebar (desktop) */}
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r bg-background transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center border-b px-3">
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto"
              onClick={toggleCollapsed}
              title="Expand sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          ) : (
            <>
              <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-md text-white">
                <ListTodo className="size-4" />
              </span>
              <span className="ml-2 font-semibold">Task Manager</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={toggleCollapsed}
                title="Collapse sidebar"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          <NavLinks collapsed={collapsed} />
        </nav>

        {/* User + controls, pinned to the bottom */}
        <div className="border-t p-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {user ? initials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                title="Log out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar (sidebar hidden on small screens) */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 md:hidden">
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

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-clip p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
