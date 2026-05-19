import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import { cn } from "../../lib/utils";

/* ── Data ──────────────────────────────────────────────── */

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  pct: number;
  state: "mastered" | "learning" | "locked";
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  source: string | NodeDatum;
  target: string | NodeDatum;
}

const RAW_NODES: Omit<NodeDatum, "x" | "y" | "vx" | "vy">[] = [
  { id: "s1",  label: "Arrays & Hashing",   pct: 92, state: "mastered" },
  { id: "s2",  label: "Two Pointers",        pct: 78, state: "mastered" },
  { id: "s3",  label: "Stack",               pct: 70, state: "mastered" },
  { id: "s4",  label: "Sliding Window",      pct: 65, state: "learning" },
  { id: "s5",  label: "Binary Search",       pct: 55, state: "learning" },
  { id: "s6",  label: "Linked List",         pct: 40, state: "learning" },
  { id: "s7",  label: "Trees",               pct: 25, state: "learning" },
  { id: "s8",  label: "Heap",                pct: 0,  state: "locked"   },
  { id: "s9",  label: "Tries",               pct: 0,  state: "locked"   },
  { id: "s10", label: "Graphs",              pct: 0,  state: "locked"   },
  { id: "s11", label: "Dynamic Programming", pct: 0,  state: "locked"   },
  { id: "s12", label: "Greedy",              pct: 0,  state: "locked"   },
];

const LINKS: LinkDatum[] = [
  { source: "s1", target: "s2" },
  { source: "s1", target: "s3" },
  { source: "s1", target: "s5" },
  { source: "s2", target: "s4" },
  { source: "s2", target: "s6" },
  { source: "s6", target: "s7" },
  { source: "s7", target: "s8" },
  { source: "s7", target: "s9" },
  { source: "s7", target: "s10" },
  { source: "s10", target: "s11" },
  { source: "s11", target: "s12" },
];

const PREREQS: Record<string, string[]> = {
  s1: ["Two Pointers", "Stack", "Binary Search"],
  s2: ["Sliding Window", "Linked List"],
  s6: ["Trees"],
  s7: ["Heap", "Tries", "Graphs"],
  s10: ["Dynamic Programming"],
  s11: ["Greedy"],
};

const R = 30; // node radius

function nodeColor(state: NodeDatum["state"]) {
  if (state === "mastered") return "#2EC866";
  if (state === "learning") return "#F59E0B";
  return "#D1D5DB";
}

function nodeFill(state: NodeDatum["state"]) {
  if (state === "mastered") return "#2EC866";
  if (state === "learning") return "#FFFFFF";
  return "#F3F4F6";
}

function nodeTextColor(state: NodeDatum["state"]) {
  if (state === "mastered") return "#FFFFFF";
  if (state === "learning") return "#F59E0B";
  return "#9CA3AF";
}

function edgeColor(source: NodeDatum, target: NodeDatum) {
  if (source.state === "locked" || target.state === "locked") return "#E5E7EB";
  return "#9CA3AF";
}

/* ── Component ─────────────────────────────────────────── */

export function SkillTree() {
  const navigate = useNavigate();
  const svgRef   = useRef<SVGSVGElement>(null);
  const simRef   = useRef<d3.Simulation<NodeDatum, LinkDatum> | null>(null);

  const [nodes, setNodes] = useState<NodeDatum[]>([]);
  const [links, setLinks] = useState<LinkDatum[]>([]);
  const [selected, setSelected] = useState<NodeDatum | null>(null);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity.translate(0, 0).scale(1));

  // keep latest transform in a ref for drag handlers (avoids stale closure)
  const transformRef = useRef(transform);
  transformRef.current = transform;

  /* ── Boot simulation ──────────────────────────────────── */
  useEffect(() => {
    const w = svgRef.current?.clientWidth  ?? 900;
    const h = svgRef.current?.clientHeight ?? 700;

    const nodeData: NodeDatum[] = RAW_NODES.map((n) => ({ ...n }));
    const linkData: LinkDatum[] = LINKS.map((l) => ({ ...l }));

    const sim = d3.forceSimulation<NodeDatum>(nodeData)
      .force("link",   d3.forceLink<NodeDatum, LinkDatum>(linkData)
                         .id((d) => d.id)
                         .distance(140)
                         .strength(0.6))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collide", d3.forceCollide(R + 18))
      .alphaDecay(0.03)
      .velocityDecay(0.4);

    sim.on("tick", () => {
      // spread state update: new array refs so React re-renders
      setNodes([...sim.nodes()]);
      setLinks([...(sim.force<d3.ForceLink<NodeDatum, LinkDatum>>("link")?.links() ?? [])]);
    });

    simRef.current = sim;

    // initial render
    setNodes([...nodeData]);
    setLinks([...linkData]);

    return () => { sim.stop(); };
  }, []);

  /* ── Zoom & pan via D3 zoom (applies to the <g> group) ─ */
  useEffect(() => {
    if (!svgRef.current) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .filter((event) => {
        // allow wheel zoom always; only pan on background (not on nodes)
        if (event.type === "wheel") return true;
        return !event.target.closest("[data-node]");
      })
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    d3.select(svgRef.current).call(zoom);

    // start at a nice default
    d3.select(svgRef.current).call(
      zoom.transform,
      d3.zoomIdentity.translate(0, 0).scale(0.9)
    );

    return () => { d3.select(svgRef.current!).on(".zoom", null); };
  }, []);

  /* ── Node drag ─────────────────────────────────────────── */
  const onNodeMouseDown = useCallback((e: React.MouseEvent, node: NodeDatum) => {
    e.stopPropagation();
    const sim = simRef.current;
    if (!sim) return;

    sim.alphaTarget(0.3).restart();

    const startX = e.clientX;
    const startY = e.clientY;
    const startFx = (node.x ?? 0);
    const startFy = (node.y ?? 0);
    const t = transformRef.current;

    node.fx = startFx;
    node.fy = startFy;

    function onMove(ev: MouseEvent) {
      const dx = (ev.clientX - startX) / t.k;
      const dy = (ev.clientY - startY) / t.k;
      node.fx = startFx + dx;
      node.fy = startFy + dy;
      sim!.alphaTarget(0.3).restart();
    }

    function onUp() {
      sim!.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  /* ── Touch drag ────────────────────────────────────────── */
  const onNodeTouchStart = useCallback((e: React.TouchEvent, node: NodeDatum) => {
    e.stopPropagation();
    const sim = simRef.current;
    if (!sim) return;
    const t0 = e.touches[0];
    const startX = t0.clientX;
    const startY = t0.clientY;
    const startFx = node.x ?? 0;
    const startFy = node.y ?? 0;
    const t = transformRef.current;
    node.fx = startFx;
    node.fy = startFy;
    sim.alphaTarget(0.3).restart();

    function onMove(ev: TouchEvent) {
      const dx = (ev.touches[0].clientX - startX) / t.k;
      const dy = (ev.touches[0].clientY - startY) / t.k;
      node.fx = startFx + dx;
      node.fy = startFy + dy;
      sim!.alphaTarget(0.3).restart();
    }
    function onEnd() {
      sim!.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, []);

  /* ── Render ─────────────────────────────────────────────── */
  const { x: tx, y: ty, k } = transform;

  return (
    <div className="relative flex overflow-hidden h-full w-full bg-[#F5F7FA]">

      {/* ── SVG canvas ─────────────────────────────────────── */}
      <svg
        ref={svgRef}
        className="flex-1 h-full w-full"
        style={{ cursor: "grab" }}
      >
        {/* Arrow marker */}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#9CA3AF" />
          </marker>
          <marker id="arrow-locked" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#E5E7EB" />
          </marker>
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-selected">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g transform={`translate(${tx},${ty}) scale(${k})`}>
          {/* Edges */}
          {links.map((link, i) => {
            const s = link.source as NodeDatum;
            const t = link.target as NodeDatum;
            if (s.x == null || t.x == null || s.y == null || t.y == null) return null;

            const dx = t.x - s.x, dy = (t.y ?? 0) - (s.y ?? 0);
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len, uy = dy / len;
            const x1 = s.x + R * ux;
            const y1 = (s.y ?? 0) + R * uy;
            const x2 = t.x - (R + 6) * ux;
            const y2 = (t.y ?? 0) - (R + 6) * uy;
            const locked = s.state === "locked" || t.state === "locked";

            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={locked ? "#1a1a2e" : "#454567"}
                strokeWidth={locked ? 1 : 1.5}
                strokeDasharray={locked ? "4 4" : undefined}
                strokeOpacity={locked ? 0.5 : 1}
                markerEnd={locked ? "url(#arrow-locked)" : "url(#arrow)"}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selected?.id === node.id;
            const cx = node.x ?? 0;
            const cy = node.y ?? 0;

            return (
              <g
                key={node.id}
                data-node="true"
                transform={`translate(${cx},${cy})`}
                style={{ cursor: "pointer" }}
                onMouseDown={(e) => onNodeMouseDown(e, node)}
                onTouchStart={(e) => onNodeTouchStart(e, node)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(selected?.id === node.id ? null : node);
                }}
              >
                {/* Outer glow ring for selected */}
                {isSelected && (
                  <circle
                    r={R + 10}
                    fill="none"
                    stroke={nodeColor(node.state)}
                    strokeWidth="1"
                    strokeOpacity="0.3"
                  />
                )}

                {/* Pulse ring for mastered */}
                {node.state === "mastered" && (
                  <circle r={R + 6} fill="none" stroke="#2EC866" strokeWidth="1" strokeOpacity="0.25">
                    <animate attributeName="r" values={`${R + 4};${R + 12};${R + 4}`} dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Main circle */}
                <circle
                  r={R}
                  fill={nodeFill(node.state)}
                  stroke={nodeColor(node.state)}
                  strokeWidth={node.state === "locked" ? 1.5 : 2.5}
                  strokeOpacity={node.state === "locked" ? 0.4 : 1}
                  filter={
                    isSelected ? "url(#glow-selected)" :
                    node.state === "mastered" ? "url(#glow-green)" : undefined
                  }
                />

                {/* Label inside circle */}
                {node.state !== "locked" ? (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={nodeTextColor(node.state)}
                    fontSize="11"
                    fontWeight="800"
                    fontFamily="Inter, sans-serif"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {node.pct}%
                  </text>
                ) : (
                  /* lock icon as text */
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#D1D5DB"
                    fontSize="16"
                    fontFamily="Material Symbols Outlined"
                    style={{ fontVariationSettings: "'FILL' 1", pointerEvents: "none", userSelect: "none" }}
                  >
                    lock
                  </text>
                )}

                {/* Label below node */}
                <text
                  y={R + 14}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fill={
                    node.state === "mastered" ? "#065F46" :
                    node.state === "learning" ? "#92400E" : "#D1D5DB"
                  }
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="Inter, sans-serif"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {node.label.split(" ").map((word, wi) => (
                    <tspan key={wi} x="0" dy={wi === 0 ? 0 : "1.2em"}>{word}</tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── HUD overlays ─────────────────────────────────── */}

      {/* Legend */}
      <div className="absolute top-5 left-5 flex gap-4 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm pointer-events-none z-20">
        {[
          { color: "#2EC866", label: "Mastered" },
          { color: "#F59E0B", label: "Learning" },
          { color: "#D1D5DB", label: "Locked"   },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill={color} /></svg>
            <span className="text-[11px] text-gray-500 font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Drag hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
          <span className="material-symbols-outlined text-sm text-gray-400">open_with</span>
          <span className="text-[10px] text-gray-400 font-medium">Drag nodes · Scroll to zoom · Pan background</span>
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────── */}
      {selected && (
        <aside className="absolute right-0 top-0 h-full w-[280px] bg-white border-l border-gray-200 shadow-lg p-6 flex flex-col z-30 overflow-y-auto">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-black text-gray-900 tracking-tight leading-tight pr-2">
                {selected.label}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <span className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border",
              selected.state === "mastered" ? "bg-green-50 text-green-700 border-green-200" :
              selected.state === "learning" ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-gray-100 text-gray-500 border-gray-200"
            )}>
              {selected.state === "mastered" ? "Mastered" :
               selected.state === "learning" ? "In Progress" : "Locked"}
            </span>
          </div>

          {/* Donut */}
          <div className="flex justify-center mb-6">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="46" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                <circle
                  cx="56" cy="56" r="46" fill="none"
                  stroke={nodeColor(selected.state)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - selected.pct / 100)}
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-gray-900">{selected.pct}%</span>
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wide">Mastery</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2.5 mb-6">
            {[
              { icon: "check_circle", color: "text-[#2EC866]", label: "Solved",     value: `${Math.round(selected.pct / 6.5) || 0} problems` },
              { icon: "schedule",     color: "text-indigo-500", label: "Time Spent", value: `~${Math.ceil(selected.pct / 12) || 0} hours` },
            ].map(({ icon, color, label, value }) => (
              <div key={label} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2.5">
                  <span className={cn("material-symbols-outlined text-sm", color)}>{icon}</span>
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          {/* Unlocks */}
          {PREREQS[selected.id] && (
            <div className="mb-6">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Unlocks:</p>
              <div className="flex flex-wrap gap-2">
                {PREREQS[selected.id].map((p) => (
                  <span key={p} className="px-2 py-1 bg-gray-100 border border-gray-200 text-[11px] text-gray-600 rounded-md">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-auto space-y-3">
            {selected.state !== "locked" ? (
              <button
                onClick={() => navigate("/challenges")}
                className="w-full bg-[#2EC866] hover:bg-[#1EA34E] text-white font-bold py-2.5 rounded-xl transition-all active:scale-[0.98] text-sm"
              >
                Practice Now
              </button>
            ) : (
              <div className="w-full bg-gray-100 text-gray-400 font-bold py-2.5 rounded-xl text-sm text-center border border-gray-200">
                Complete prerequisites first
              </div>
            )}
            <button
              onClick={() => navigate("/challenges")}
              className="w-full flex items-center justify-center gap-1.5 text-[#2EC866] font-bold text-sm hover:underline"
            >
              View Challenges
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
