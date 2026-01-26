import { useRef, useState } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import type { GraphData, WorldNode } from '../types';
import { useD3Graph } from '../hooks/useD3Graph';
import { useStore } from '../store/useStore';
import { useLanguage } from '../contexts/LanguageContext';

interface RelationshipGraphProps {
    data: GraphData;
    onNodeClick: (nodeId: string) => void;
}

export const RelationshipGraph = ({ data, onNodeClick }: RelationshipGraphProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { updateNode } = useStore();
    const { t } = useLanguage();
    const [helpOpen, setHelpOpen] = useState(false);

    const handleNodeUpdate = (nodeId: string, updates: Partial<WorldNode>) => {
        const node = data.nodes.find(n => n.id === nodeId);
        if (node) {
            updateNode({ ...node, ...updates });
        }
    };

    // Hook handles the D3 logic.
    useD3Graph({
        containerRef: svgRef,
        data,
        onNodeClick,
        onNodeUpdate: handleNodeUpdate
    });

    // Fallback UI
    if (!data || data.nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] bg-slate-100 text-slate-500 border rounded-lg">
                <AlertCircle className="w-12 h-12 mb-2" />
                <p className="text-lg font-medium">{t('empty.noData')}</p>
                <p className="text-sm">{t('empty.noDataDesc')}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[600px] overflow-hidden bg-slate-50 relative border border-slate-200 rounded-xl shadow-sm bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
            <svg
                ref={svgRef}
                className="w-full h-full touch-none block"
                width="100%"
                height="100%"
            />

            {/* Help Toggle Button */}
            <button
                onClick={() => setHelpOpen(!helpOpen)}
                className="absolute bottom-4 left-4 bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-full shadow-lg transition-colors z-10"
                title={helpOpen ? t('help.close') : t('help.open')}
            >
                <HelpCircle className="w-5 h-5" />
            </button>

            {/* Help/Manual Section - Collapsible */}
            {helpOpen && (
                <div className="absolute bottom-20 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-100/50 text-xs text-slate-700 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <p className="font-bold mb-3 text-slate-900 pb-1 border-b border-slate-100 uppercase tracking-wider text-[10px]">{t('help.title')}</p>
                    <div className="space-y-2">
                        <div>
                            <p className="font-semibold text-slate-800 mb-1">🖱️ {t('help.nodeClick')}</p>
                            <p className="text-slate-600">{t('help.nodeClickDesc')}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 mb-1">✋ {t('help.nodeDrag')}</p>
                            <p className="text-slate-600">{t('help.nodeDragDesc')}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 mb-1">💯 {t('help.affinityScore')}</p>
                            <p className="text-slate-600">{t('help.affinityScoreDesc')}</p>
                        </div>
                    </div>
                </div>
            )}



            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-xs font-semibold text-slate-500 pointer-events-none border border-slate-100">
                {t('graph.zoomDrag')}
            </div>
        </div>
    );
};

