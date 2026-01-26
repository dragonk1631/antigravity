import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphData, WorldNode } from '../types';

type SimulationNode = WorldNode & d3.SimulationNodeDatum;
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
    source: SimulationNode | string;
    target: SimulationNode | string;
    affinityScore: number;
    label: string;
    isBidirectional?: boolean;
}

interface UseD3GraphProps {
    containerRef: React.RefObject<SVGSVGElement | null>;
    data: GraphData;
    onNodeClick: (nodeId: string) => void;
    onNodeUpdate?: (nodeId: string, updates: Partial<WorldNode>) => void;
}

export const useD3Graph = ({ containerRef, data, onNodeClick, onNodeUpdate }: UseD3GraphProps) => {
    const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);

    // Use refs for callbacks to prevent re-initialization of the graph when callbacks change
    const onNodeClickRef = useRef(onNodeClick);
    const onNodeUpdateRef = useRef(onNodeUpdate);

    useEffect(() => {
        onNodeClickRef.current = onNodeClick;
        onNodeUpdateRef.current = onNodeUpdate;
    }, [onNodeClick, onNodeUpdate]);

    useEffect(() => {
        if (!containerRef.current || !data.nodes.length) return;

        const svg = d3.select(containerRef.current);
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        svg.selectAll('*').remove();

        // Data copy with position initialization
        const nodes: SimulationNode[] = data.nodes.map(d => ({
            ...d,
            // If pinned, set fixed position. If just saved, set starting position.
            x: d.x ?? undefined,
            y: d.y ?? undefined,
            fx: d.pinned ? d.x : undefined,
            fy: d.pinned ? d.y : undefined
        }) as SimulationNode);

        const links: SimulationLink[] = data.links.map(d => ({ ...d })) as unknown as SimulationLink[];

        // Identify bidirectional links
        for (let i = 0; i < links.length; i++) {
            const l = links[i];
            for (let j = i + 1; j < links.length; j++) {
                const other = links[j];
                // Check if they connect same nodes in opposite direction
                if ((l.source === other.target && l.target === other.source)) {
                    l.isBidirectional = true;
                    other.isBidirectional = true;
                }
            }
        }

        // Define markers and filters
        const defs = svg.append('defs');

        // Arrow Marker
        defs.append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 34)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#94a3b8');

        // Positive affinity arrow (green)
        defs.append('marker')
            .attr('id', 'arrow-positive')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 34)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#10b981');

        // Negative affinity arrow (red)
        defs.append('marker')
            .attr('id', 'arrow-negative')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 34)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#ef4444');

        // Drop Shadow
        const filter = defs.append('filter')
            .attr('id', 'drop-shadow')
            .attr('height', '130%');

        filter.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 3)
            .attr('result', 'blur');

        filter.append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 2)
            .attr('dy', 2)
            .attr('result', 'offsetBlur');

        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'offsetBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .filter((event) => {
                // Prevent zoom from capturing events on node elements
                const target = event.target as Element;
                if (target.closest('.nodes')) {
                    return false;
                }
                return true;
            })
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom).on('dblclick.zoom', null);

        const simulation = d3.forceSimulation<SimulationNode, SimulationLink>(nodes)
            .force('charge', d3.forceManyBody().strength(-500))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide(60))
            .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
                .id(d => d.id)
                .distance(150) // Fixed distance for all links
            );

        simulationRef.current = simulation;

        // Links Group
        const linkGroup = g.append('g').attr('class', 'links');

        // Link Paths
        const link = linkGroup
            .selectAll('path')
            .data(links)
            .join('path')
            .attr('stroke', d => {
                // Color based on affinity score
                if (d.affinityScore > 20) return '#10b981'; // green-500 for positive
                if (d.affinityScore < -20) return '#ef4444'; // red-500 for negative
                return '#cbd5e1'; // slate-300 for neutral
            })
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('marker-end', d => {
                // Different arrows for different affinity
                if (d.affinityScore > 20) return 'url(#arrow-positive)';
                if (d.affinityScore < -20) return 'url(#arrow-negative)';
                return 'url(#arrow)';
            });

        // Link Labels Group
        const linkLabelGroup = g.append('g').attr('class', 'link-labels');

        const linkLabel = linkLabelGroup
            .selectAll('g')
            .data(links)
            .join('g');

        // Link Label Background (Pill)
        linkLabel.append('rect')
            .attr('rx', 10)
            .attr('ry', 10)
            .attr('fill', '#f1f5f9') // slate-100
            .attr('stroke', '#cbd5e1') // slate-300
            .attr('stroke-width', 1);

        // Link Label Text
        linkLabel.append('text')
            .text(d => d.label)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', '#475569') // slate-600
            .attr('font-size', '10px')
            .attr('font-weight', '600');

        // Nodes
        const nodeGroup = g.append('g').attr('class', 'nodes');
        const node = nodeGroup
            .selectAll<SVGGElement, SimulationNode>('g')
            .data(nodes)
            .join('g')
            .attr('cursor', 'pointer');

        // Track drag state to distinguish between click and drag
        let dragMoved = false;
        let dragStartPos = { x: 0, y: 0 };
        const CLICK_THRESHOLD = 5; // pixels

        node.call(d3.drag<SVGGElement, SimulationNode>()
            .on('start', function (event, d) {
                dragMoved = false;
                dragStartPos = { x: event.x, y: event.y };
                console.log('Drag start at', dragStartPos);
                // Don't restart simulation here - wait for actual drag movement
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', function (event, d) {
                const dx = Math.abs(event.x - dragStartPos.x);
                const dy = Math.abs(event.y - dragStartPos.y);
                if (dx > CLICK_THRESHOLD || dy > CLICK_THRESHOLD) {
                    if (!dragMoved) {
                        // Only restart simulation on first actual drag movement
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                    }
                    dragMoved = true;
                }
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', function (event, d) {
                console.log('Drag end', { dragMoved, nodeId: d.id });
                if (!event.active) simulation.alphaTarget(0);

                // If we dragged, update position but only keep pinned if it was ALREADY pinned
                if (dragMoved) {
                    if (d.pinned) {
                        d.fx = d.x;
                        d.fy = d.y;
                    } else {
                        // If not pinned, release it
                        d.fx = null;
                        d.fy = null;
                    }

                    // Save the new position (and current pin state)
                    if (onNodeUpdateRef.current) {
                        onNodeUpdateRef.current(d.id, {
                            x: d.x,
                            y: d.y,
                            pinned: d.pinned
                        });
                    }
                } else {
                    // If we didn't drag, treat it as a click

                    // CRITICAL: If the node is not pinned, we must release the 'fix' set by drag start.
                    // Otherwise, a single click leaves the node 'stuck' (fixed position) without being pinned.
                    if (!d.pinned) {
                        d.fx = null;
                        d.fy = null;
                    }

                    console.log('Treating as click! Calling onNodeClick with:', d.id);
                    onNodeClickRef.current(d.id);
                }
            })
        )
            .on('dblclick', function (event, d) {
                event.stopPropagation(); // Prevent zoom or other interactions

                d.pinned = !d.pinned;

                if (d.pinned) {
                    d.fx = d.x;
                    d.fy = d.y;
                } else {
                    d.fx = null;
                    d.fy = null;
                }

                console.log('Node double-clicked, pinned state:', d.pinned);

                if (onNodeUpdateRef.current) {
                    onNodeUpdateRef.current(d.id, {
                        pinned: d.pinned,
                        x: d.pinned ? d.x : undefined,
                        y: d.pinned ? d.y : undefined
                    });
                }
            });

        // Node Visuals
        node.each(function (d) {
            const el = d3.select(this);
            const radius = 28; // Increased slightly

            // Pin Indicator (Halo)
            if (d.pinned) {
                el.append('circle')
                    .attr('r', radius + 6)
                    .attr('fill', 'none')
                    .attr('stroke', '#ef4444')
                    .attr('stroke-width', 1.5)
                    .attr('stroke-dasharray', '3 3')
                    .attr('opacity', 0.6);
            }

            // Define colors
            let strokeColor = '#9ca3af';
            if (d.type === 'character') strokeColor = '#3b82f6'; // blue
            if (d.type === 'location') strokeColor = '#10b981'; // emerald
            if (d.type === 'event') strokeColor = '#f59e0b'; // amber

            // Thumbnail Clip Path ID
            const clipId = `clip-${d.id}`;

            // Add ClipPath definition for this node
            defs.append('clipPath')
                .attr('id', clipId)
                .append('circle')
                .attr('r', radius);

            // 1. Shadow Drop (Circle underneath)
            el.append('circle')
                .attr('r', radius)
                .attr('fill', '#fff')
                .attr('filter', 'url(#drop-shadow)');

            // 2. Image (if exists) OR Placeholder
            if (d.thumbnailUrl) {
                el.append('image')
                    .attr('href', d.thumbnailUrl)
                    .attr('x', -radius)
                    .attr('y', -radius)
                    .attr('width', radius * 2)
                    .attr('height', radius * 2)
                    .attr('clip-path', `url(#${clipId})`)
                    .attr('preserveAspectRatio', 'xMidYMid slice');
            } else {
                // Placeholder background
                el.append('circle')
                    .attr('r', radius)
                    .attr('fill', '#f8fafc') // slate-50
                    .attr('stroke', 'none');

                // Initials
                el.append('text')
                    .text((d.name || '?').substring(0, 1).toUpperCase())
                    .attr('dy', '0.35em')
                    .attr('text-anchor', 'middle')
                    .attr('fill', strokeColor)
                    .attr('font-size', '16px')
                    .attr('font-weight', 'bold');
            }

            // 3. Border Ring (Over image)
            el.append('circle')
                .attr('r', radius)
                .attr('fill', 'none')
                .attr('stroke', strokeColor)
                .attr('stroke-width', 3);

            // 4. Name Label (Below)
            el.append('text')
                .text(d.name)
                .attr('x', 0)
                .attr('y', radius + 18)
                .attr('text-anchor', 'middle')
                .attr('fill', '#1e293b') // slate-800
                .attr('font-size', '13px')
                .attr('font-weight', '700')
                .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)');

            // 5. Role/Type Label (Below Name)
            el.append('text')
                .text((d as any).role || d.type)
                .attr('x', 0)
                .attr('y', radius + 32)
                .attr('text-anchor', 'middle')
                .attr('fill', '#64748b') // slate-500
                .attr('font-size', '10px')
                .attr('font-weight', '500');
        });

        simulation.on('tick', () => {
            link.attr('d', (d) => {
                const s = d.source as SimulationNode;
                const t = d.target as SimulationNode;
                if (!s.x || !s.y || !t.x || !t.y) return null;

                if (d.isBidirectional) {
                    const dx = t.x - s.x;
                    const dy = t.y - s.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist === 0) return `M${s.x},${s.y}L${t.x},${t.y}`;

                    // Parallel offset for straight lines
                    const offset = 4; // Shift amount
                    // Unit normal vector (-dy, dx) normalized
                    const nx = -dy / dist;
                    const ny = dx / dist;

                    const sx = s.x + nx * offset;
                    const sy = s.y + ny * offset;
                    const tx = t.x + nx * offset;
                    const ty = t.y + ny * offset;

                    return `M${sx},${sy}L${tx},${ty}`;
                }
                return `M${s.x},${s.y}L${t.x},${t.y}`;
            });

            linkLabel.attr('transform', (d) => {
                const s = d.source as SimulationNode;
                const t = d.target as SimulationNode;
                if (!s.x || !s.y || !t.x || !t.y) return null;

                let x = (s.x + t.x) / 2;
                let y = (s.y + t.y) / 2;

                if (d.isBidirectional) {
                    const dx = t.x - s.x;
                    const dy = t.y - s.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        // Move label closer to center but slightly offset (45%)
                        // This staggers them (A->B at 45%, B->A at 45% from B = 55% from A)
                        const ratio = 0.45;
                        x = s.x + dx * ratio;
                        y = s.y + dy * ratio;

                        // Same offset logic for label
                        const offset = 4;
                        const nx = -dy / dist;
                        const ny = dx / dist;

                        x += nx * offset;
                        y += ny * offset;
                    }
                }
                return `translate(${x},${y})`;
            });

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => {
            simulation.stop();
        };
    }, [data, containerRef]);
};
