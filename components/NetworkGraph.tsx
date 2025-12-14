import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Note } from '../types';
import { ZoomIn, ZoomOut, Maximize, RefreshCw } from 'lucide-react';

interface NetworkGraphProps {
  notes: Note[];
  onNoteClick: (noteId: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  group: number;
  x?: number;
  y?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ notes, onNoteClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || notes.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // --- Defs for Grid Pattern and Filters ---
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    const defs = svg.append("defs");
    
    // Grid Pattern
    const pattern = defs.append("pattern")
        .attr("id", "grid")
        .attr("width", 40)
        .attr("height", 40)
        .attr("patternUnits", "userSpaceOnUse");
    
    pattern.append("circle")
        .attr("cx", 1)
        .attr("cy", 1)
        .attr("r", 1)
        .attr("fill", "#334155")
        .attr("opacity", 0.5);

    // Glow Filter
    const filter = defs.append("filter")
        .attr("id", "glow");
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "2.5")
        .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Background Rectangle with Grid
    svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "url(#grid)");

    // --- Data Preparation ---
    const nodes: GraphNode[] = notes.map(note => ({
      id: note.id,
      title: note.title || 'Untitled',
      group: 1
    }));

    const links: GraphLink[] = [];
    const noteIdMap = new Map<string, string>();
    notes.forEach(n => noteIdMap.set(n.title, n.id));
    
    notes.forEach(note => {
      const regex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = regex.exec(note.content)) !== null) {
        const targetTitle = match[1];
        const targetId = noteIdMap.get(targetTitle);
        if (targetId && targetId !== note.id) {
          links.push({ source: note.id, target: targetId });
        }
      }
    });

    // --- Simulation ---
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(50));

    // --- Render Groups ---
    const g = svg.append("g");
    
    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setTransform(event.transform); // Sync state
      });
    
    zoomRef.current = zoom;
    svg.call(zoom);

    // Links
    const link = g.append("g")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", (event) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        })
        .on("end", (event) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }) as any
      );

    // Circle background (halo)
    node.append("circle")
        .attr("r", 15)
        .attr("fill", "#6366f1")
        .attr("opacity", 0.1)
        .attr("class", "halo");

    // Main Circle
    node.append("circle")
      .attr("r", 6)
      .attr("fill", "#6366f1")
      .attr("stroke", "#e0e7ff")
      .attr("stroke-width", 1.5)
      .style("filter", "url(#glow)")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNoteClick(d.id);
      })
      .on("mouseover", function() {
        d3.select(this.parentNode as Element).select(".halo")
            .transition().duration(300).attr("r", 25).attr("opacity", 0.2);
        d3.select(this).transition().duration(200).attr("r", 9).attr("fill", "#818cf8");
      })
      .on("mouseout", function() {
        d3.select(this.parentNode as Element).select(".halo")
            .transition().duration(300).attr("r", 15).attr("opacity", 0.1);
        d3.select(this).transition().duration(200).attr("r", 6).attr("fill", "#6366f1");
      });

    // Labels
    node.append("text")
      .attr("dy", 24)
      .attr("text-anchor", "middle")
      .text(d => d.title)
      .attr("fill", "#cbd5e1")
      .style("pointer-events", "none")
      .style("font-size", "11px")
      .style("font-family", "Inter, sans-serif")
      .style("text-shadow", "0px 2px 4px #020617");

    // Ticker
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [notes, onNoteClick]);

  // Zoom Controls
  const handleZoom = (factor: number) => {
    if (svgRef.current && zoomRef.current) {
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, factor);
    }
  };

  const handleReset = () => {
      if (svgRef.current && zoomRef.current) {
          const svg = d3.select(svgRef.current);
          svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
      }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full block"></svg>
      
      {notes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-slate-500 text-lg mb-2">The canvas is empty</p>
              <p className="text-slate-700 text-sm">Create notes and link them to see the galaxy form</p>
          </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-slate-900/90 backdrop-blur border border-slate-700 p-2 rounded-xl shadow-2xl">
        <button onClick={() => handleZoom(1.2)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <ZoomIn size={20} />
        </button>
        <button onClick={() => handleZoom(0.8)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <ZoomOut size={20} />
        </button>
        <button onClick={handleReset} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <RefreshCw size={20} />
        </button>
      </div>

      <div className="absolute top-6 left-6 pointer-events-none">
         <div className="bg-slate-900/50 backdrop-blur border border-slate-800 px-4 py-2 rounded-lg">
             <h2 className="text-slate-200 font-semibold text-sm">Knowledge Graph</h2>
             <p className="text-slate-500 text-xs">{notes.length} nodes • {transform.k.toFixed(1)}x zoom</p>
         </div>
      </div>
    </div>
  );
};

export default NetworkGraph;