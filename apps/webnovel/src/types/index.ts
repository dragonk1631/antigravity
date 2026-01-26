export type EntityType = 'character' | 'location' | 'event';

export interface Entity {
    id: string;
    name: string;
    description?: string;
    type: EntityType;
    thumbnailUrl?: string; // For image in the graph node
    pinned?: boolean;
    x?: number;
    y?: number;
}

export interface Character extends Entity {
    type: 'character';
    age?: number;
    role?: string; // e.g., Protagonist, Antagonist
}

export interface Location extends Entity {
    type: 'location';
    region?: string;
}

export interface Event extends Entity {
    type: 'event';
    timelineDate?: string;
}

// Union type for nodes
export type WorldNode = Character | Location | Event;

export interface Relationship {
    id: string;
    source: string; // ID of source node
    target: string; // ID of target node
    label: string; // e.g., "Friend", "Enemy"
    affinityScore: number; // -100 to 100, affects distance in graph
    description?: string;
}

export interface GraphData {
    nodes: WorldNode[];
    links: Relationship[];
}
