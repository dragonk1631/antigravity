import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { GraphData, Relationship, WorldNode } from '../types';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function cleanGraphData(data: any): GraphData {
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
        throw new Error('Invalid data format');
    }

    // 1. Clean Nodes
    const validNodeIds = new Set<string>();
    const cleanNodes: WorldNode[] = data.nodes.map((node: any) => {
        // Strip D3 internal properties (vx, vy, index, fx, fy)
        // Keep x, y, pinned for persistence
        const { vx, vy, index, fx, fy, ...cleanNode } = node;
        validNodeIds.add(cleanNode.id);
        return cleanNode as WorldNode;
    });

    // 2. Clean Links
    const cleanLinks: Relationship[] = data.links.reduce((acc: Relationship[], link: any) => {
        // Ensure source/target are strings (IDs)
        let sourceId: string;
        let targetId: string;

        if (typeof link.source === 'object' && link.source !== null) {
            sourceId = link.source.id;
        } else {
            sourceId = String(link.source);
        }

        if (typeof link.target === 'object' && link.target !== null) {
            targetId = link.target.id;
        } else {
            targetId = String(link.target);
        }

        // Only keep links where both endpoints exist
        if (validNodeIds.has(sourceId) && validNodeIds.has(targetId)) {
            const { index, source, target, ...rest } = link;
            acc.push({
                ...rest,
                source: sourceId,
                target: targetId,
            } as Relationship);
        }

        return acc;
    }, []);

    return {
        nodes: cleanNodes,
        links: cleanLinks,
    };
}
