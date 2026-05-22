// Figma asset URLs — valid for 7 days from 2026-05-22
const ASSET = {
  dashboard:  "https://www.figma.com/api/mcp/asset/4bcb7c45-a9db-46db-bbb3-cfd882d45448",
  plus:       "https://www.figma.com/api/mcp/asset/533903f1-0038-4f90-88fa-1916a48695d3",
  clock:      "https://www.figma.com/api/mcp/asset/ca69dd40-1eeb-4159-8ae1-82113b6b892c",
  file:       "https://www.figma.com/api/mcp/asset/1adfbb1f-b6af-40ff-ad19-9f40973309dd",
  settings:   "https://www.figma.com/api/mcp/asset/307b7641-0093-4f40-bd02-fc2a8cdc00d6",
  menu:       "https://www.figma.com/api/mcp/asset/b732eccc-6f91-46c8-8a97-480bbb96e9f9",
  user:       "https://www.figma.com/api/mcp/asset/8d2d9125-0ce3-4d70-8bfc-9a74a1c87d4a",
  plusBtn:    "https://www.figma.com/api/mcp/asset/c257a606-db6d-4963-af29-eb3657691363",
  target:     "https://www.figma.com/api/mcp/asset/431ba518-6b93-476e-9051-fed43d6b276c",
  arrowUp:    "https://www.figma.com/api/mcp/asset/d2a9b33f-cdbe-4eaa-acdf-6426d256fefa",
  chart:      "https://www.figma.com/api/mcp/asset/98b0261a-fa51-409b-9e3c-774367b62e3b",
  activity:   "https://www.figma.com/api/mcp/asset/a407666f-2344-4e03-b386-ed1a4f406861",
  arrowDown:  "https://www.figma.com/api/mcp/asset/1159b452-b21d-414c-b4ce-80833bcd14a9",
  eye:        "https://www.figma.com/api/mcp/asset/7498731a-fce6-436c-a209-8f6dc616eb80",
  arrowRight: "https://www.figma.com/api/mcp/asset/3a2bedd0-d93d-4a22-9996-13ed40427b9a",
};

type Category = "TECHNICAL" | "BEHAVIORAL" | "CASE" | "GENERAL";

type Session = {
  name: string;
  meta: string;
  category: Category;
  date: string;
  score: number;
};

const CATEGORY_STYLE: Record<Category, { bg: string; border: string; color: string }> = {
  TECHNICAL:  { bg: "#d6e8e2", border: "#3a8377", color: "#3a8377" },
  BEHAVIORAL: { bg: "#ddd9f0", border: "#7e78d2", color: "#7e78d2" },
  CASE:       { bg: "#f4d9d2", border: "#c75240", color: "#c75240" },
  GENERAL:    { bg: "#ddd9f0", border: "#7e78d2", color: "#7e78d2" },
};

const SESSIONS: Session[] = [
  { name: "Software Engineer",     meta: "3 Q · 4:32 · TECHNICAL",  category: "TECHNICAL",  date: "2026.05.21", score: 87 },
  { name: "Leadership Behavioral", meta: "3 Q · 5:14 · BEHAVIORAL", category: "BEHAVIORAL", date: "2026.05.19", score: 74 },
  { name: "Data Analyst Case",     meta: "3 Q · 6:08 · CASE",       category: "CASE",       date: "2026.05.17", score: 68 },
  { name: "General Introduction",  meta: "3 Q · 3:51 · GENERAL",    category: "GENERAL",    date: "2026.05.14", score: 81 },
];

function scoreColor(score: number): string {
  return score >= 80 ? "#3a8377" : "#c9a227";
}

// ─── Sub-components ────────────────────────────────────────────────────────

type NavItemProps = { icon: string; label: string; active?: boolean };

function NavItem({ icon, label, active = false }: NavItemProps) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-2.5 px-2.5 py-2.5 ${
        active ? "bg-[#0a0a0a]" : "hover:bg-black/5"
      }`}
    >
      <img src={icon} alt="" className="size-3.5 shrink-0" />
      <span
        className={`text-[12px] uppercase tracking-[0.6px] ${
          active ? "text-[#faf7f2]" : "text-[#0a0a0a]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

type StatCardProps = {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  trend: { icon: string; text: string };
  borderRight?: boolean;
};

function StatCard({ icon, label, value, unit, trend, borderRight = true }: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-2 bg-white p-5 ${
        borderRight ? "border-r border-[#0a0a0a]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <img src={icon} alt="" className="size-3.5" />
        <span className="text-[10px] uppercase tracking-[1.5px] text-[#bfbfbf]">{label}</span>
      </div>

      <div className="flex items-baseline gap-1 py-2">
        <span className="text-[40px] font-bold leading-[40px] tracking-[-1.2px] text-[#0a0a0a]">
          {value}
        </span>
        {unit && (
          <span className="text-[14px] leading-[14px] text-[#bfbfbf]">{unit}</span>
        )}
      </div>

      <div className="flex items-center gap-1 self-start bg-[#d6e8e2] px-1.5 py-[3px]">
        <img src={trend.icon} alt="" className="size-2.5" />
        <span className="text-[10px] uppercase tracking-[1px] text-[#3a8377]">{trend.text}</span>
      </div>
    </div>
  );
}

type SessionRowProps = { session: Session; isLast: boolean };

function SessionRow({ session, isLast }: SessionRowProps) {
  const cat = CATEGORY_STYLE[session.category];
  return (
    <div
      className={`grid grid-cols-[1fr_140px_120px_80px_40px] items-center gap-x-4 px-5 py-4 ${
        !isLast ? "border-b border-[#0a0a0a]" : ""
      }`}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium uppercase tracking-[0.26px] text-[#0a0a0a]">
          {session.name}
        </span>
        <span className="text-[10px] tracking-[0.5px] text-[#bfbfbf]">{session.meta}</span>
      </div>

      <div>
        <span
          className="inline-block border px-[11px] py-[5px] text-[10px] font-bold uppercase tracking-[1px]"
          style={{ backgroundColor: cat.bg, borderColor: cat.border, color: cat.color }}
        >
          {session.category}
        </span>
      </div>

      <span className="text-[11px] tracking-[0.55px] text-[#0a0a0a]">{session.date}</span>

      <span
        className="text-[20px] font-bold tracking-[-0.4px]"
        style={{ color: scoreColor(session.score) }}
      >
        {session.score}
      </span>

      <div className="flex items-center">
        <img src={ASSET.arrowRight} alt="View session" className="size-3.5" />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <div className="flex h-full overflow-hidden border border-[#0a0a0a] bg-[#faf7f2]">
      {/* ── Sidebar ── */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#0a0a0a]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-[#0a0a0a] px-4">
          <div className="size-6 bg-[#0a0a0a]" />
          <span className="text-[14px] font-bold uppercase tracking-[0.7px] text-[#0a0a0a]">
            Lumen
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <div className="px-2 pb-1.5 pt-3">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Workspace</span>
          </div>
          <NavItem icon={ASSET.dashboard} label="Dashboard" active />
          <NavItem icon={ASSET.plus}      label="New Simulation" />

          <div className="px-2 pb-1.5 pt-3.5">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Library</span>
          </div>
          <NavItem icon={ASSET.clock} label="History" />
          <NavItem icon={ASSET.file}  label="Report Cards" />

          <div className="px-2 pb-1.5 pt-3.5">
            <span className="text-[10px] uppercase tracking-[2px] text-[#bfbfbf]">Account</span>
          </div>
          <NavItem icon={ASSET.settings} label="Settings" />
        </nav>

        {/* Footer */}
        <div className="border-t border-[#0a0a0a] px-4 py-4">
          <button className="mb-3 flex h-9 w-full items-center justify-center border border-[#0a0a0a] bg-white hover:bg-black/5">
            <img src={ASSET.menu} alt="Toggle sidebar" className="size-3.5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center bg-[#0a0a0a]">
              <img src={ASSET.user} alt="" className="size-3.5" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#0a0a0a]">
                Rafif R.
              </p>
              <p className="truncate text-[10px] text-[#bfbfbf]">rafif@telkom</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto px-10">
        {/* Page header */}
        <div className="flex items-end justify-between border-b border-[#0a0a0a] pb-5 pt-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-[36px] font-bold uppercase leading-[36px] tracking-[-1.08px] text-[#0a0a0a]">
              Dashboard
            </h1>
            <p className="text-[11px] uppercase tracking-[1.1px] text-[#bfbfbf]">
              [ Welcome back, Rafif — 12% above last week ]
            </p>
          </div>
          <button className="flex items-center gap-2 border border-[#0a0a0a] bg-[#0a0a0a] px-6 py-[15px] hover:bg-[#1a1a1a]">
            <img src={ASSET.plusBtn} alt="" className="size-4" />
            <span className="text-[13px] font-medium uppercase tracking-[1.3px] text-[#faf7f2]">
              New simulation
            </span>
          </button>
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-4 border border-[#0a0a0a]">
          <StatCard
            icon={ASSET.target}   label="Avg Score"   value="78" unit="/100"
            trend={{ icon: ASSET.arrowUp,   text: "12% vs last wk" }}
          />
          <StatCard
            icon={ASSET.chart}    label="Sessions"    value="14"
            trend={{ icon: ASSET.arrowUp,   text: "4 this week"    }}
          />
          <StatCard
            icon={ASSET.activity} label="Filler Rate" value="3.2" unit="%"
            trend={{ icon: ASSET.arrowDown, text: "0.8% improving" }}
          />
          <StatCard
            icon={ASSET.eye}      label="Eye Contact" value="82" unit="%"
            trend={{ icon: ASSET.arrowUp,   text: "5% steady"      }}
            borderRight={false}
          />
        </div>

        {/* Recent sessions */}
        <div className="mt-10 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold uppercase tracking-[-0.18px] text-[#0a0a0a]">
              [ Recent sessions ]
            </h2>
            <a
              href="#"
              className="text-[11px] uppercase tracking-[1.1px] text-[#0a0a0a] underline"
            >
              View all →
            </a>
          </div>

          <div className="mt-4 border border-[#0a0a0a] bg-white">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_140px_120px_80px_40px] items-center gap-x-4 border-b border-[#0a0a0a] bg-[#0a0a0a] px-5 py-2.5">
              {(["Session", "Category", "Date", "Score", ""] as const).map((heading) => (
                <span
                  key={heading}
                  className="text-[10px] uppercase tracking-[1.5px] text-[#faf7f2]"
                >
                  {heading}
                </span>
              ))}
            </div>

            {SESSIONS.map((session, i) => (
              <SessionRow
                key={session.name}
                session={session}
                isLast={i === SESSIONS.length - 1}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
