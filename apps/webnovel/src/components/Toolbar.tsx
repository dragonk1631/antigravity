import { useRef } from 'react';
import { Upload, Plus, Edit3, Save, RotateCcw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn, cleanGraphData } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

export const Toolbar = () => {
    const { graphData, setGraphData, isEditMode, toggleEditMode, addNode } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useLanguage();

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graphData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "nexus_wiki_data.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files[0]) {
            fileReader.readAsText(event.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
                if (e.target?.result) {
                    try {
                        const parsedData = JSON.parse(e.target.result as string);
                        const cleanedData = cleanGraphData(parsedData);
                        setGraphData(cleanedData);
                        alert(t('toolbar.importSuccess') || '데이터를 성공적으로 불러왔습니다.');
                    } catch (error) {
                        console.error(error);
                        alert(t('toolbar.importError') || '데이터를 불러오는 중 오류가 발생했습니다.');
                    }
                }
            };
        }
    };

    const handleAddNode = () => {
        const id = `node_${Date.now()}`;
        addNode({
            id,
            type: 'character',
            name: t('node.newCharacter'),
            description: '',
            role: t('node.newRole'),
            pinned: true,
            x: 0,
            y: 0
        });

        // Auto-select the new node to open sidebar
        useStore.getState().selectNode(id);
    };

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg border border-slate-200 rounded-full px-6 py-3 flex items-center gap-4 z-50 transition-all hover:scale-105">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                <button
                    onClick={handleExport}
                    className="flex flex-col items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                    title={t('toolbar.save')}
                >
                    <Save className="w-5 h-5" />
                    <span>{t('toolbar.save')}</span>
                </button>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                    title={t('toolbar.open')}
                >
                    <Upload className="w-5 h-5" />
                    <span>{t('toolbar.open')}</span>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImport}
                    className="hidden"
                    accept=".json"
                />

                <div className="w-px h-6 bg-slate-200 mx-2"></div>

                <button
                    onClick={() => {
                        if (confirm(t('toolbar.resetConfirm') || '모든 데이터를 초기 상태로 되돌리시겠습니까?')) {
                            useStore.getState().resetData();
                            alert(t('toolbar.resetDone') || '초기화되었습니다.');
                        }
                    }}
                    className="flex flex-col items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-600 transition-colors"
                    title={t('toolbar.reset')}
                >
                    <RotateCcw className="w-5 h-5" />
                    <span>{t('toolbar.reset')}</span>
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={toggleEditMode}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors",
                        isEditMode
                            ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                >
                    <Edit3 className="w-4 h-4" />
                    {isEditMode ? t('toolbar.editEnd') : t('toolbar.editMode')}
                </button>

                {isEditMode && (
                    <button
                        onClick={handleAddNode}
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-600 shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('toolbar.addNode')}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

