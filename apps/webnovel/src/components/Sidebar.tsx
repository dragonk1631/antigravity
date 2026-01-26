import { useState } from 'react';
import { X, User, MapPin, Calendar, BookOpen, Trash2, Link as LinkIcon, Pin, PinOff, Edit, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { WorldNode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const {
        graphData,
        selectedNodeId,
        isEditMode,
        toggleEditMode,
        updateNode,
        deleteNode,
        selectNode,
        addLink,
        updateLink,
        deleteLink
    } = useStore();
    const { t } = useLanguage();

    // ... (omitted)



    const [newLinkTarget, setNewLinkTarget] = useState('');
    const [newLinkLabel, setNewLinkLabel] = useState('');
    const [linkDirection, setLinkDirection] = useState<'outgoing' | 'incoming'>('outgoing');
    const [newLinkScore, setNewLinkScore] = useState(0);
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editLabel, setEditLabel] = useState('');

    const selectedNode = graphData.nodes.find(n => n.id === selectedNodeId);

    if (!isOpen) return null;

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'character': return <User className="w-5 h-5 text-blue-500" />;
            case 'location': return <MapPin className="w-5 h-5 text-emerald-500" />;
            case 'event': return <Calendar className="w-5 h-5 text-amber-500" />;
            default: return <BookOpen className="w-5 h-5" />;
        }
    };

    const handleUpdate = (field: keyof WorldNode, value: any) => {
        if (!selectedNode) return;
        updateNode({ ...selectedNode, [field]: value });
    };

    const handleDelete = () => {
        if (confirm('정말로 이 노드를 삭제하시겠습니까?')) {
            if (selectedNodeId) deleteNode(selectedNodeId);
            onClose();
        }
    };

    const handleAddLink = () => {
        if (!selectedNodeId || !newLinkTarget) return;

        const isOutgoing = linkDirection === 'outgoing';

        addLink({
            id: `rel_${Date.now()}`,
            source: isOutgoing ? selectedNodeId : newLinkTarget,
            target: isOutgoing ? newLinkTarget : selectedNodeId,
            label: newLinkLabel || t('rel.new'),
            affinityScore: Number(newLinkScore)
        });

        setNewLinkLabel('');
        setNewLinkScore(0);
        setNewLinkTarget('');
        setLinkDirection('outgoing');
    };

    const handleUpdateLink = (linkId: string) => {
        const link = graphData.links.find(l => l.id === linkId);
        if (!link) return;

        updateLink({
            ...link,
            affinityScore: Number(editValue),
            label: editLabel
        });

        setEditingLinkId(null);
        setEditValue('');
        setEditLabel('');
    };

    const relatedLinks = selectedNode
        ? graphData.links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
        : [];

    const availableTargets = graphData.nodes.filter(n => n.id !== selectedNodeId);

    // .. But standard implementation:
    const handleImageDrop = (e: React.DragEvent) => {
        if (!isEditMode || !selectedNode) return;
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                handleUpdate('thumbnailUrl', e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                handleUpdate('thumbnailUrl', e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUrlInput = () => {
        const url = prompt("이미지 URL을 입력하세요:", selectedNode?.thumbnailUrl);
        if (url !== null) {
            handleUpdate('thumbnailUrl', url);
        }
    };



    return (
        <aside
            className={`fixed inset-y-0 right-0 w-96 bg-white border-l shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            {selectedNode ? (
                <div className="flex flex-col h-full font-sans">
                    {/* Header Image / Icon */}
                    <div
                        className="h-64 bg-slate-100 relative group flex-shrink-0"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleImageDrop}
                    >
                        {selectedNode.thumbnailUrl ? (
                            <img
                                src={selectedNode.thumbnailUrl}
                                alt={selectedNode.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                                {getNodeIcon(selectedNode.type)}
                            </div>
                        )}

                        {/* Image Edit Overlay (Only in Edit Mode) */}
                        {isEditMode && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <p className="text-white text-xs font-bold mb-2">이미지 변경 (드래그 앤 드롭 가능)</p>
                                <div className="flex gap-2">
                                    <label className="cursor-pointer bg-white text-slate-800 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-100 flex items-center gap-1">
                                        <LinkIcon className="w-3 h-3" />
                                        <span>파일</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                    </label>
                                    <button
                                        onClick={handleUrlInput}
                                        className="bg-white text-slate-800 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-100 flex items-center gap-1"
                                    >
                                        <LinkIcon className="w-3 h-3" />
                                        <span>URL</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Pin Button */}
                        <div className="absolute bottom-2 left-2 flex gap-2 z-10">
                            <button
                                onClick={() => handleUpdate('pinned', !selectedNode.pinned)}
                                className={`p-2 rounded-full shadow-sm transition-colors ${selectedNode.pinned ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-white/80 text-slate-500 hover:bg-white hover:text-indigo-600'}`}
                                title={selectedNode.pinned ? "고정 해제" : "위치 고정"}
                            >
                                {selectedNode.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Edit Toggle & Actions */}
                        <div className="absolute bottom-2 right-2 flex gap-2 z-10">
                            {/* View/Edit Toggle */}
                            <button
                                onClick={() => toggleEditMode()}
                                className={`p-2 rounded-full shadow-sm transition-colors ${isEditMode ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-white/80 text-slate-500 hover:bg-white hover:text-indigo-600'}`}
                                title={isEditMode ? "편집 완료" : "정보 수정"}
                            >
                                {isEditMode ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                            </button>

                            {/* Delete Button */}
                            {isEditMode && (
                                <button
                                    onClick={handleDelete}
                                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-sm transition-colors"
                                    title={t('sidebar.delete')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Edit Form / View */}
                    <div className="flex-1 p-6 overflow-y-auto">

                        {/* Name Section (Moved Up) */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                                {t('sidebar.name')}
                            </label>

                            {isEditMode ? (
                                <input
                                    type="text"
                                    value={selectedNode.name}
                                    onChange={(e) => handleUpdate('name', e.target.value)}
                                    className="w-full text-xl font-bold p-2 border-b-2 border-indigo-200 focus:border-indigo-600 outline-none bg-transparent"
                                    placeholder={t('sidebar.enterName')}
                                />
                            ) : (
                                <h2 className="text-xl font-bold text-slate-800 p-2">{selectedNode.name}</h2>
                            )}
                        </div>



                        {/* Role Selector (Character Only) */}
                        {selectedNode.type === 'character' && (
                            <div className="mb-4">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">인물 유형 (Role)</label>
                                {isEditMode ? (
                                    <select
                                        value={(selectedNode as any).role || '중립'}
                                        onChange={(e) => handleUpdate('role' as any, e.target.value)}
                                        className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                                    >
                                        <option value="주인공">주인공 (Protagonist)</option>
                                        <option value="조력자">조력자 (Helper)</option>
                                        <option value="중립">중립 (Neutral)</option>
                                        <option value="대립자">대립자 (Antagonist)</option>
                                    </select>
                                ) : (
                                    <div className={`w-full p-2 border rounded text-sm font-bold 
                                        ${(selectedNode as any).role === '주인공' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                            (selectedNode as any).role === '대립자' ? 'bg-red-50 text-red-700 border-red-200' :
                                                (selectedNode as any).role === '조력자' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'}`}
                                    >
                                        {(selectedNode as any).role || '중립'}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Description */}
                        <div className="mb-6">
                            <h3 className="text-sm uppercase text-slate-400 font-bold tracking-wider mb-2">{t('sidebar.description')}</h3>
                            {isEditMode ? (
                                <textarea
                                    value={selectedNode.description || ''}
                                    onChange={(e) => handleUpdate('description', e.target.value)}
                                    className="w-full h-32 p-3 border rounded text-sm leading-relaxed focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                                    placeholder={t('sidebar.enterDescription')}
                                />
                            ) : (
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap p-3 bg-slate-50 rounded min-h-[5rem]">
                                    {selectedNode.description || '-'}
                                </p>
                            )}
                        </div>

                        {/* Relationships */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm uppercase text-slate-400 font-bold tracking-wider">{t('sidebar.relationships')}</h3>
                            </div>

                            <div className="space-y-3 mb-6">
                                {relatedLinks.map(link => {
                                    const isSource = link.source === selectedNode.id;
                                    const otherId = isSource ? link.target : link.source;

                                    const targetIdStr = typeof otherId === 'object' ? (otherId as any).id : otherId;
                                    const targetNode = graphData.nodes.find(n => n.id === targetIdStr);

                                    if (!targetNode) return null;

                                    return (
                                        <div key={link.id} className="group relative flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100 hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isEditMode && selectNode(targetNode.id)}>
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden flex-shrink-0">
                                                    {targetNode.thumbnailUrl ? (
                                                        <img src={targetNode.thumbnailUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        targetNode.name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{targetNode.name}</p>
                                                    <p className="text-xs text-slate-500">{isSource ? '→ To' : '← From'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-2">
                                                {editingLinkId === link.id ? (
                                                    <div className="flex flex-col gap-1 items-end">
                                                        <input
                                                            type="text"
                                                            value={editLabel}
                                                            onChange={(e) => setEditLabel(e.target.value)}
                                                            className="w-20 text-xs p-1 border rounded text-right"
                                                            placeholder="관계명"
                                                            autoFocus
                                                        />
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="w-12 text-xs p-1 border rounded text-right"
                                                            onBlur={() => handleUpdateLink(link.id)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleUpdateLink(link.id);
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p
                                                            className="text-sm font-medium text-indigo-600 cursor-pointer hover:underline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isEditMode) {
                                                                    setEditingLinkId(link.id);
                                                                    setEditValue(String(link.affinityScore));
                                                                    setEditLabel(link.label);
                                                                }
                                                            }}
                                                        >
                                                            {link.label}
                                                        </p>
                                                        <p
                                                            className={`text-xs ${link.affinityScore > 0 ? 'text-emerald-600' : 'text-red-500'} cursor-pointer hover:bg-slate-100 px-1 rounded`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isEditMode) {
                                                                    setEditingLinkId(link.id);
                                                                    setEditValue(String(link.affinityScore));
                                                                    setEditLabel(link.label);
                                                                }
                                                            }}
                                                            title={isEditMode ? "클릭하여 수정" : ""}
                                                        >
                                                            {link.affinityScore > 0 ? `+${link.affinityScore}` : link.affinityScore}
                                                        </p>
                                                    </>
                                                )}
                                            </div>

                                            {isEditMode && (
                                                <button
                                                    onClick={() => deleteLink(link.id)}
                                                    className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add Relationship Form */}
                            {isEditMode && (
                                <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                                    <h4 className="text-xs font-bold text-indigo-900 uppercase mb-3 flex items-center gap-1">
                                        <LinkIcon className="w-3 h-3" /> 관계 추가
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 mb-1">
                                            <button
                                                onClick={() => setLinkDirection('outgoing')}
                                                className={`flex-1 text-xs py-1 px-2 rounded border ${linkDirection === 'outgoing' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}
                                            >
                                                → 보내는 관계 (To)
                                            </button>
                                            <button
                                                onClick={() => setLinkDirection('incoming')}
                                                className={`flex-1 text-xs py-1 px-2 rounded border ${linkDirection === 'incoming' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}
                                            >
                                                ← 받는 관계 (From)
                                            </button>
                                        </div>

                                        <select
                                            value={newLinkTarget}
                                            onChange={(e) => setNewLinkTarget(e.target.value)}
                                            className="text-sm p-2 border rounded"
                                        >
                                            <option value="">대상 선택...</option>
                                            {availableTargets.map(n => (
                                                <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="관계명 (예: 친구)"
                                                value={newLinkLabel}
                                                onChange={(e) => setNewLinkLabel(e.target.value)}
                                                className="flex-1 text-sm p-2 border rounded"
                                            />
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={newLinkScore}
                                                onChange={(e) => setNewLinkScore(Number(e.target.value))}
                                                className="w-16 text-sm p-2 border rounded text-center"
                                                title="친밀도 (-100 ~ 100)"
                                            />
                                        </div>

                                        <button
                                            onClick={handleAddLink}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded text-sm font-bold transition-colors mt-2"
                                        >
                                            추가
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col bg-slate-50">
                    {isEditMode ? (
                        <div className="p-6 h-full flex flex-col">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-indigo-600" />
                                    {t('dashboard.title')}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {t('dashboard.instruction')}
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-sm">
                                <div className="p-3 border-b bg-slate-50 sticky top-0">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase">
                                        {t('dashboard.allItems')} ({graphData.nodes.length})
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {graphData.nodes.map(node => (
                                        <div
                                            key={node.id}
                                            onClick={() => selectNode(node.id)}
                                            className="p-3 hover:bg-indigo-50 cursor-pointer flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200 overflow-hidden">
                                                {node.thumbnailUrl ? (
                                                    <img src={node.thumbnailUrl} alt={node.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    getNodeIcon(node.type)
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{node.name}</p>
                                                <span className="text-xs text-slate-400 capitalize">{node.type}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {graphData.nodes.length === 0 && (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            {t('dashboard.noData')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                            <p>{t('empty.instruction')}</p>
                        </div>
                    )}
                </div>
            )
            }
        </aside >
    );
};
