import { useStore } from './store/useStore';
import { RelationshipGraph } from './components/RelationshipGraph';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { BookOpen, Globe } from 'lucide-react';
import { useCallback, useState } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

function AppContent() {
  const { graphData, selectNode, selectedNodeId, isEditMode } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const handleNodeClick = useCallback((id: string) => {
    console.log('handleNodeClick called with id:', id);
    console.log('Before: sidebarOpen=', sidebarOpen, 'selectedNodeId=', selectedNodeId);
    selectNode(id);
    setSidebarOpen(true);
    console.log('After setSidebarOpen(true)');
  }, [selectNode, sidebarOpen, selectedNodeId]);

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    selectNode(null);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ko' ? 'en' : 'ko');
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <main className="flex-1 flex flex-col h-full relative">
        <header className="h-14 border-b bg-white px-6 flex items-center justify-between shadow-sm z-10">
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            {t('header.title')} <span className="text-indigo-600">{t('header.subtitle')}</span>
          </h1>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-sm font-medium text-slate-600 transition-colors"
            title={language === 'ko' ? 'Switch to English' : '한국어로 전환'}
          >
            <Globe className="w-4 h-4" />
            {t('toolbar.language')}
          </button>
        </header>

        <div className="flex-1 p-4 overflow-hidden relative">
          <RelationshipGraph
            data={graphData}
            onNodeClick={handleNodeClick}
          />
        </div>

        {/* Floating Toolbar */}
        <Toolbar />
      </main>

      <Sidebar
        isOpen={sidebarOpen || !!selectedNodeId || isEditMode}
        onClose={handleSidebarClose}
      />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;

