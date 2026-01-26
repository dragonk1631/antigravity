import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GraphData, WorldNode, Relationship } from '../types';

interface AppState {
    graphData: GraphData;
    selectedNodeId: string | null;
    isEditMode: boolean;

    // Actions
    setGraphData: (data: GraphData) => void;
    selectNode: (nodeId: string | null) => void;
    toggleEditMode: () => void;

    // CRUD
    addNode: (node: WorldNode) => void;
    updateNode: (node: WorldNode) => void;
    deleteNode: (nodeId: string) => void;

    addLink: (link: Relationship) => void;
    updateLink: (link: Relationship) => void;
    deleteLink: (linkId: string) => void;

    resetData: () => void;
}

const INITIAL_DATA: GraphData = {
    nodes: [
        { id: 'c1', type: 'character', name: '김독자', description: '독자', role: '주인공' },
        { id: 'c2', type: 'character', name: '유중혁', description: '회귀자', role: '주인공' },
        { id: 'c3', type: 'character', name: '한수영', description: '작가', role: '조력자' },
        { id: 'c4', type: 'character', name: '이지혜', description: '마법사', role: '조력자' },
        { id: 'c5', type: 'character', name: '정희원', description: '검사', role: '조력자' },
    ],
    links: [
        { id: 'r1', source: 'c1', target: 'c2', label: '동료', affinityScore: 50 },
        { id: 'r2', source: 'c1', target: 'c3', label: '파트너', affinityScore: 80 },
        { id: 'r3', source: 'c2', target: 'c3', label: '경계', affinityScore: -20 },
        { id: 'r4', source: 'c1', target: 'c4', label: '친구', affinityScore: 60 },
        { id: 'r5', source: 'c1', target: 'c5', label: '동료', affinityScore: 70 },
    ],
};

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            graphData: INITIAL_DATA,
            selectedNodeId: null,
            isEditMode: false,

            setGraphData: (data) => set({ graphData: data }),
            selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
            toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

            addNode: (node) => set((state) => ({
                graphData: { ...state.graphData, nodes: [...state.graphData.nodes, node] }
            })),

            updateNode: (updatedNode) => set((state) => ({
                graphData: {
                    ...state.graphData,
                    nodes: state.graphData.nodes.map((node) =>
                        node.id === updatedNode.id ? updatedNode : node
                    ),
                },
            })),

            deleteNode: (nodeId) => set((state) => ({
                selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
                graphData: {
                    nodes: state.graphData.nodes.filter((n) => n.id !== nodeId),
                    links: state.graphData.links.filter((l) => l.source !== nodeId && l.target !== nodeId),
                },
            })),

            addLink: (link) => set((state) => ({
                graphData: { ...state.graphData, links: [...state.graphData.links, link] }
            })),

            updateLink: (updatedLink) => set((state) => ({
                graphData: {
                    ...state.graphData,
                    links: state.graphData.links.map((l) =>
                        l.id === updatedLink.id ? updatedLink : l
                    )
                }
            })),

            deleteLink: (linkId) => set((state) => ({
                graphData: { ...state.graphData, links: state.graphData.links.filter((l) => l.id !== linkId) }
            })),

            resetData: () => set({ graphData: INITIAL_DATA }),
        }),
        {
            name: 'nexus-wiki-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
