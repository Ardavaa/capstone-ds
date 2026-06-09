"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { logout } from "@/app/auth/actions";
import AppIcon, { type IconName } from "@/app/components/AppIcon";

function IconLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="9" width="1.5" height="6" rx="0.5" />
      <rect x="5" y="6" width="1.5" height="12" rx="0.5" />
      <rect x="8" y="3" width="1.5" height="18" rx="0.5" />
      <rect x="11" y="5" width="1.5" height="14" rx="0.5" />
      <rect x="14" y="2" width="1.5" height="20" rx="0.5" />
      <rect x="17" y="7" width="1.5" height="10" rx="0.5" />
      <rect x="20" y="10" width="1.5" height="4" rx="0.5" />
    </svg>
  );
}

function SidebarNavItem({ icon, label, active = false, href }: { icon: IconName; label: string; active?: boolean; href?: string }) {
  const content = (
    <div
      title={label}
      className={`flex size-12 cursor-pointer items-center justify-center rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${
        active
          ? "bg-white/10 text-white font-medium border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          : "text-white/50 hover:bg-white/5 hover:text-white/80"
      }`}
    >
      <AppIcon name={icon} className={`size-5 ${active ? "text-white" : ""}`} strokeWidth={active ? 2.2 : 1.8} />
    </div>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function Sidebar() {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userInitials, setUserInitials] = useState("U");

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || "User";
        const names = name.trim().split(/\s+/);
        if (names.length === 1) {
          setUserInitials(names[0].charAt(0).toUpperCase());
        } else if (names.length > 1) {
          setUserInitials(
            (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
          );
        }
      }
    }
    fetchProfile().catch(console.error);
  }, []);

  return (
    <aside className="relative z-20 flex w-[112px] shrink-0 flex-col items-center justify-between py-6 px-4 bg-transparent h-screen">
      <div className="flex flex-col items-center justify-between w-full h-full rounded-[24px] border border-white/10 bg-[#0A0D14] py-8 text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="flex flex-col items-center gap-10 w-full">
          <div className="text-white/90 hover:scale-105 transition-transform duration-300">
            <IconLogo size={28} />
          </div>
          <nav className="flex flex-col gap-4">
            <SidebarNavItem icon="clock" label="History" href="/history" active={pathname?.startsWith("/history")} />
            <SidebarNavItem icon="dashboard" label="Dashboard" href="/dashboard" active={pathname?.startsWith("/dashboard")} />
            <SidebarNavItem icon="eye" label="Simulation" href="/simulation/setup" active={pathname?.startsWith("/simulation")} />
            <SidebarNavItem icon="chart" label="Analytics" href="/report-cards" active={pathname?.startsWith("/report-cards")} />
          </nav>
        </div>
        
        <div className="relative flex flex-col items-center">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="size-11 overflow-hidden rounded-full border border-white/10 bg-[#1E1E1E] flex items-center justify-center font-semibold tracking-wider text-white text-[15px] shadow-md hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {userInitials}
          </button>
          
          {isProfileOpen && (
            <div className="absolute bottom-14 left-0 min-w-[140px] rounded-xl border border-white/10 bg-[#1a1d24] p-1.5 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button 
                onClick={async () => {
                  localStorage.clear();
                  sessionStorage.clear();
                  await logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/70 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
