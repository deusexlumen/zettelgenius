import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Note } from '../types';
import { ZoomIn, ZoomOut, RefreshCw, Share2, MousePointer2 } from 'lucide-react';

/**
 * NetworkGraph Component
 * * Visualizes the knowledge base as a force-directed graph (Neural Galaxy).
 * * Uses D3.js for physics simulation and SVG rendering.
 */
interface NetworkGraphProps {
  notes: Note[];
  onNoteClick: (noteId: string) => void;
}

// Types for D3
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  group: number;
  tags: string[];
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ notes, onNoteClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Ref to store the zoom behavior instance
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || notes.length === 0) return;

    // 1. Cleanup & Setup
    d3.select(svgRef.current).selectAll("*").remove();
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("cursor", "grab");

    // 2. Define Filters (Glow Effects)
    const defs = svg.append("defs");
    
    // Node Glow
    const filter = defs.append("filter")
        .attr("id", "glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
    
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "2.5")
        .attr("result", "coloredBlur");
        
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Grid Pattern
    const pattern = defs.append("pattern")
        .attr("id", "grid")
        .attr("width", 50)
        .attr("height", 50)
        .attr("patternUnits", "userSpaceOnUse");
        
    pattern.append("circle")
        .attr("cx", 1)
        .attr("cy", 1)
        .attr("r", 1)
        .attr("fill", "#6366f1") // Indigo-500
        .attr("opacity", 0.2);

    // 3. Prepare Data
    // Extract links from [[WikiLinks]] in content
    const nodes: GraphNode[] = notes.map(n => ({ 
        id: n.id, 
        title: n.title || "Untitled", 
        group: 1,
        tags: n.tags
    }));
    
    const links: GraphLink[] = [];
    const titleToId = new Map(notes.map(n => [n.title.toLowerCase(), n.id]));

    notes.forEach(source => {
        const regex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = regex.exec(source.content)) !== null) {
            const targetTitle = match[1].toLowerCase();
            const targetId = titleToId.get(targetTitle);
            if (targetId && targetId !== source.id) {
                links.push({ source: source.id, target: targetId });
            }
        }
    });

    // 4. Create Simulation Physics
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40));

    // 5. Build Visual Elements
    
    // Background Grid Rect (receives zoom events)
    const bg = svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "url(#grid)")
        .attr("opacity", 0.5);

    const g = svg.append("g"); // Main container for zoomable elements

    // Links (Lines)
    const link = g.append("g")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.3)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

    // Nodes (Groups of Circle + Text)
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>() // Drag behavior
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            svg.style("cursor", "grabbing");
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            svg.style("cursor", "grab");
        }) as any
      );

    // Halo (Outer glow circle)
    node.append("circle")
        .attr("r", 0) // Start small for animation
        .attr("fill", "#6366f1")
        .attr("opacity", 0.1)
        .attr("class", "halo")
        .transition().duration(1000)
        .attr("r", 20);

    // Core (The actual dot)
    node.append("circle")
      .attr("r", 8)
      .attr("fill", "#0f172a") // Slate-900 center
      .attr("stroke", "#818cf8") // Indigo-400 border
      .attr("stroke-width", 2)
      .style("filter", "url(#glow)")
      .on("click", (event, d) => {
          event.stopPropagation(); // Prevent drag from triggering
          onNoteClick(d.id);
      })
      .on("mouseover", function() {
          d3.select(this)
            .transition().duration(200)
            .attr("stroke", "#c7d2fe") // Brighter on hover
            .attr("stroke-width", 3);
          d3.select(this.parentNode as Element).select(".halo")
            .transition().duration(300)
            .attr("r", 35)
            .attr("opacity", 0.2);
      })
      .on("mouseout", function() {
          d3.select(this)
            .transition().duration(200)
            .attr("stroke", "#818cf8")
            .attr("stroke-width", 2);
          d3.select(this.parentNode as Element).select(".halo")
            .transition().duration(300)
            .attr("r", 20)
            .attr("opacity", 0.1);
      });

    // Labels
    node.append("text")
      .text(d => d.title)
      .attr("x", 14)
      .attr("y", 4)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "11px")
      .attr("fill", "#cbd5e1") // Slate-300
      .attr("font-weight", "500")
      .style("pointer-events", "none")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)");

    // 6. Ticker (Update positions on every frame)
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // 7. Zoom Logic
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
            setZoomLevel(event.transform.k);
            
            // Parallax effect for grid
            bg.attr("transform", event.transform);
        });

    zoomBehavior.current = zoom;
    svg.call(zoom);
    
    // Initial Center
    svg.call(zoom.transform, d3.zoomIdentity);

    return () => simulation.stop();
  }, [notes, onNoteClick]);

  // --- UI Controls ---

  const handleZoom = (factor: number) => {
      if (svgRef.current && zoomBehavior.current) {
          d3.select(svgRef.current)
            .transition().duration(300)
            .call(zoomBehavior.current.scaleBy, factor);
      }
  };

  const handleReset = () => {
      if (svgRef.current && zoomBehavior.current) {
          d3.select(svgRef.current)
            .transition().duration(750)
            .call(zoomBehavior.current.transform, d3.zoomIdentity);
      }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden relative group/graph">
      {/* The Galaxy Canvas */}
      <svg ref={svgRef} className="w-full h-full block"></svg>
      
      {notes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 animate-pulse">
                <Share2 size={32} className="text-indigo-400 opacity-50" />
              </div>
              <p className="text-slate-500 text-lg font-medium">The canvas is empty</p>
              <p className="text-slate-600 text-sm mt-1">Create notes and link them [[LikeThis]]</p>
          </div>
      )}

      {/* Floating Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-2xl flex flex-col gap-1">
            <button onClick={() => handleZoom(1.3)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <ZoomIn size={18} />
            </button>
            <button onClick={() => handleZoom(0.7)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <ZoomOut size={18} />
            </button>
            <div className="h-px bg-white/10 mx-2 my-0.5"></div>
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded-lg transition-colors" title="Reset View">
                <RefreshCw size={18} />
            </button>
        </div>
      </div>

      {/* Info HUD */}
      <div className="absolute top-6 left-6 pointer-events-none opacity-0 group-hover/graph:opacity-100 transition-opacity duration-500">
         <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 px-3 py-2 rounded-lg flex items-center gap-3">
             <div className="flex flex-col">
                 <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Zoom</span>
                 <span className="text-sm font-mono text-indigo-300">{Math.round(zoomLevel * 100)}%</span>
             </div>
             <div className="w-px h-6 bg-white/10"></div>
             <div className="flex flex-col">
                 <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Nodes</span>
                 <span className="text-sm font-mono text-slate-300">{notes.length}</span>
             </div>
         </div>
      </div>
    </div>
  );
};

export default NetworkGraph;