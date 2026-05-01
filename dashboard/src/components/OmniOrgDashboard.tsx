/**
 * OmniOrg Dashboard
 * Visual command centre for all 900 agents
 * Built with React + framer-motion (installed globally)
 */

import { useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Agent {
  id: string;
  name: string;
  role: string;
  tier: 1 | 2 | 3 | 4 | 5;
  department: string;
  status: "active" | "busy" | "standby";
  languages: number;
}

interface OrderResult {
  output: string;
  agentsUsed: string[];
  processingTimeMs: number;
}

// ── COLOUR MAP ────────────────────────────────────────────────────────────────
const TIER_COLOURS: Record<number, string> = {
  1: "#f59e0b",   // Gold — C-Suite
  2: "#3b82f6",   // Blue — Division Heads
  3: "#8b5cf6",   // Purple — Domain Experts
  4: "#10b981",   // Green — Specialists
  5: "#6b7280",   // Grey — Task Agents
};

const STATUS_COLOURS = {
  active:  "#10b981",
  busy:    "#f59e0b",
  standby: "#6b7280",
};

const DEPT_ICONS: Record<string, string> = {
  Executive: "👑", Engineering: "⚙️", Medicine: "🏥", Legal: "⚖️",
  Finance: "📊", Science: "🔬", Creative: "🎨", Operations: "🔧",
  Research: "📚", Sales: "🎯", Data: "🧠", Security: "🔐",
};

// ── SAMPLE AGENTS (real list loads from registry) ─────────────────────────────
const SAMPLE_AGENTS: Agent[] = [
  { id:"ceo-001",      role:"CEO",                   tier:1, department:"Executive",   status:"active",  name:"Chief Executive Officer",   languages:40 },
  { id:"coo-001",      role:"COO",                   tier:1, department:"Executive",   status:"active",  name:"Chief Operating Officer",   languages:40 },
  { id:"cfo-001",      role:"CFO",                   tier:1, department:"Executive",   status:"active",  name:"Chief Financial Officer",   languages:40 },
  { id:"cto-001",      role:"CTO",                   tier:1, department:"Executive",   status:"active",  name:"Chief Technology Officer",  languages:40 },
  { id:"cmo-001",      role:"CMO",                   tier:1, department:"Executive",   status:"active",  name:"Chief Marketing Officer",   languages:40 },
  { id:"clo-001",      role:"CLO",                   tier:1, department:"Executive",   status:"active",  name:"Chief Legal Officer",       languages:40 },
  { id:"chro-001",     role:"CHRO",                  tier:1, department:"Executive",   status:"active",  name:"Chief HR Officer",          languages:40 },
  { id:"cdo-001",      role:"CDO",                   tier:1, department:"Executive",   status:"active",  name:"Chief Data Officer",        languages:40 },
  { id:"cso-001",      role:"CSO",                   tier:1, department:"Executive",   status:"busy",    name:"Chief Security Officer",    languages:40 },
  { id:"cro-001",      role:"CRO",                   tier:1, department:"Executive",   status:"active",  name:"Chief Revenue Officer",     languages:40 },
  { id:"eng-fe-001",   role:"Sr. Frontend Engineer", tier:3, department:"Engineering", status:"active",  name:"Frontend Expert",           languages:40 },
  { id:"eng-be-001",   role:"Sr. Backend Engineer",  tier:3, department:"Engineering", status:"active",  name:"Backend Expert",            languages:40 },
  { id:"eng-ai-001",   role:"Sr. AI/ML Engineer",    tier:3, department:"Engineering", status:"busy",    name:"AI/ML Expert",              languages:40 },
  { id:"eng-sec-001",  role:"Sr. Security Engineer", tier:3, department:"Security",    status:"active",  name:"Security Expert",           languages:40 },
  { id:"med-gp-001",   role:"General Physician",     tier:3, department:"Medicine",    status:"standby", name:"Medical Expert",            languages:40 },
  { id:"med-onc-001",  role:"Oncologist",            tier:3, department:"Medicine",    status:"standby", name:"Oncology Expert",           languages:40 },
  { id:"law-corp-001", role:"Corporate Lawyer",      tier:3, department:"Legal",       status:"active",  name:"Corporate Law Expert",      languages:40 },
  { id:"law-priv-001", role:"Privacy Lawyer",        tier:3, department:"Legal",       status:"standby", name:"Privacy Law Expert",        languages:40 },
  { id:"fin-ib-001",   role:"Investment Banker",     tier:3, department:"Finance",     status:"active",  name:"Investment Banking Expert", languages:40 },
  { id:"fin-qa-001",   role:"Quant Analyst",         tier:3, department:"Finance",     status:"active",  name:"Quant Finance Expert",      languages:40 },
  { id:"sci-phy-001",  role:"Physicist",             tier:3, department:"Science",     status:"standby", name:"Physics Expert",            languages:40 },
  { id:"sci-neu-001",  role:"Neuroscientist",        tier:3, department:"Science",     status:"standby", name:"Neuroscience Expert",       languages:40 },
  { id:"cre-ux-001",   role:"Sr. UX Designer",       tier:3, department:"Creative",    status:"active",  name:"UX Design Expert",          languages:40 },
  { id:"cre-cpy-001",  role:"Sr. Copywriter",        tier:3, department:"Creative",    status:"active",  name:"Content & Copy Expert",     languages:40 },
];

// ── AGENT CARD ────────────────────────────────────────────────────────────────
function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${TIER_COLOURS[agent.tier]}33`,
        borderLeft: `3px solid ${TIER_COLOURS[agent.tier]}`,
        borderRadius: 12,
        padding: "14px 16px",
        cursor: "pointer",
        position: "relative",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Status dot */}
      <motion.div
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: 12, right: 12,
          width: 8, height: 8, borderRadius: "50%",
          background: STATUS_COLOURS[agent.status],
        }}
      />

      {/* Dept icon + tier badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{DEPT_ICONS[agent.department] ?? "🤖"}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1,
          color: TIER_COLOURS[agent.tier],
          background: `${TIER_COLOURS[agent.tier]}22`,
          padding: "2px 7px", borderRadius: 20,
        }}>
          T{agent.tier}
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 3, lineHeight: 1.3 }}>
        {agent.role}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{agent.department}</div>
      <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>
        🌍 {agent.languages} languages
      </div>
    </motion.div>
  );
}

// ── COMMAND PANEL ─────────────────────────────────────────────────────────────
function CommandPanel({ onSubmit }: { onSubmit: (order: string) => void }) {
  const [order, setOrder] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 24,
        marginBottom: 32,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>
        🎯 Give the Order
      </div>
      <textarea
        value={order}
        onChange={e => setOrder(e.target.value)}
        placeholder="Type any task in any language — the right agent(s) will be activated automatically..."
        style={{
          width: "100%", minHeight: 80, background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          color: "#f1f5f9", fontSize: 14, padding: 14, resize: "vertical",
          outline: "none", fontFamily: "inherit", boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        {["Code", "Research", "Legal", "Financial", "Strategy", "Medical"].map(type => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOrder(prev => `[${type}] ${prev}`)}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8", fontSize: 11, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
            }}
          >{type}</motion.button>
        ))}
        <motion.button
          whileHover={{ scale: 1.03, background: "rgba(99,102,241,0.9)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { if (order.trim()) { onSubmit(order); setOrder(""); } }}
          style={{
            marginLeft: "auto", background: "#6366f1",
            border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 24px", borderRadius: 10, cursor: "pointer",
          }}
        >Deploy Agents →</motion.button>
      </div>
    </motion.div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function OmniOrgDashboard() {
  const [filter, setFilter] = useState<string>("All");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [loading, setLoading] = useState(false);

  const departments = ["All", ...Array.from(new Set(SAMPLE_AGENTS.map(a => a.department)))];

  const filtered = filter === "All"
    ? SAMPLE_AGENTS
    : SAMPLE_AGENTS.filter(a => a.department === filter);

  const stats = {
    active: SAMPLE_AGENTS.filter(a => a.status === "active").length,
    busy:   SAMPLE_AGENTS.filter(a => a.status === "busy").length,
    depts:  new Set(SAMPLE_AGENTS.map(a => a.department)).size,
  };

  const handleOrder = async (order: string) => {
    setLoading(true);
    // In production: calls orchestrator.ts via API endpoint
    // Here: simulated response
    await new Promise(r => setTimeout(r, 1800));
    setResult({
      output: `✅ OmniOrg has received your order.\n\nTask: "${order}"\n\nThe Master Orchestrator has analysed your request and activated the optimal agent team. To run the full orchestrator with real Claude API calls:\n\n  cd C:/Users/BBMW0/Projects/OmniOrg\n  npm install\n  npx ts-node agents/orchestrator/orchestrator.ts "${order}"`,
      agentsUsed: ["orch-master-001", "ceo-001", "cto-001"],
      processingTimeMs: 1800,
    });
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#f1f5f9", fontFamily: "system-ui, sans-serif", padding: "32px 40px" }}>

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ fontSize: 40 }}
          >🌐</motion.div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, #f59e0b, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              OmniOrg
            </h1>
            <div style={{ fontSize: 13, color: "#64748b" }}>900 Agents · All Professions · All Languages · All Countries</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
            {[
              { label: "Active",  value: stats.active,  color: "#10b981" },
              { label: "Busy",    value: stats.busy,    color: "#f59e0b" },
              { label: "Depts",   value: stats.depts,   color: "#6366f1" },
              { label: "Total",   value: 900,           color: "#94a3b8" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Command Panel */}
      <CommandPanel onSubmit={handleOrder} />

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ textAlign:"center", padding: 32, color: "#6366f1", fontSize: 15 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration:1, repeat:Infinity, ease:"linear" }}
              style={{ display:"inline-block", fontSize:28, marginBottom:12 }}>⚙️</motion.div>
            <div>Orchestrator routing your request to the best agents...</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:16, padding:20, marginBottom:32 }}>
            <div style={{ fontSize:12, color:"#6366f1", fontWeight:700, letterSpacing:1, marginBottom:8, textTransform:"uppercase" }}>
              ✅ Agent Response — {result.processingTimeMs}ms
            </div>
            <pre style={{ margin:0, whiteSpace:"pre-wrap", fontSize:13, color:"#cbd5e1", lineHeight:1.7 }}>
              {result.output}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Department Filter */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {departments.map(dept => (
          <motion.button key={dept} whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
            onClick={() => setFilter(dept)}
            style={{
              padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
              border: filter===dept ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
              background: filter===dept ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
              color: filter===dept ? "#a5b4fc" : "#64748b",
            }}
          >{DEPT_ICONS[dept] ?? "🤖"} {dept}</motion.button>
        ))}
      </div>

      {/* Agent Grid */}
      <motion.div layout style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:14 }}>
        <AnimatePresence>
          {filtered.map(agent => (
            <AgentCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent)} />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setSelectedAgent(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(8px)" }}>
            <motion.div initial={{ scale:0.85, y:40 }} animate={{ scale:1, y:0 }} exit={{ scale:0.85, y:40 }}
              onClick={e => e.stopPropagation()}
              style={{ background:"#0f172a", border:`1px solid ${TIER_COLOURS[selectedAgent.tier]}44`, borderRadius:20, padding:32, width:420, maxWidth:"90vw" }}>
              <div style={{ fontSize:32, marginBottom:16 }}>{DEPT_ICONS[selectedAgent.department] ?? "🤖"}</div>
              <h2 style={{ margin:"0 0 4px", fontSize:20, color:"#f1f5f9" }}>{selectedAgent.role}</h2>
              <div style={{ color:"#6366f1", fontSize:13, marginBottom:16 }}>{selectedAgent.department} · Tier {selectedAgent.tier}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { label:"Status",    value:selectedAgent.status },
                  { label:"Languages", value:`${selectedAgent.languages} languages` },
                  { label:"Tier",      value:`Tier ${selectedAgent.tier}` },
                  { label:"ID",        value:selectedAgent.id },
                ].map(item => (
                  <div key={item.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 14px" }}>
                    <div style={{ fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{item.label}</div>
                    <div style={{ fontSize:13, color:"#cbd5e1", fontWeight:600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                onClick={() => setSelectedAgent(null)}
                style={{ width:"100%", background:"#6366f1", border:"none", color:"#fff", fontWeight:700, fontSize:14, padding:"12px", borderRadius:12, cursor:"pointer" }}>
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
