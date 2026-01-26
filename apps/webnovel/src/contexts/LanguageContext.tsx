import { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'ko' | 'en';

interface Translations {
    [key: string]: {
        ko: string;
        en: string;
    };
}

export const translations: Translations = {
    // Header
    'header.title': { ko: '세계관 설정 관리', en: 'World Setting Wiki' },
    'header.subtitle': { ko: 'Nexus Wiki', en: 'Nexus Wiki' },

    // Toolbar
    'toolbar.save': { ko: '저장', en: 'Save' },
    'toolbar.open': { ko: '열기', en: 'Open' },
    'toolbar.reset': { ko: '초기화', en: 'Reset' },
    'toolbar.editMode': { ko: '편집 모드', en: 'Edit Mode' },
    'toolbar.addNode': { ko: '노드 추가', en: 'Add Node' },
    'toolbar.language': { ko: 'EN', en: '한글' },

    // Sidebar
    'sidebar.type': { ko: '유형', en: 'Type' },
    'sidebar.name': { ko: '이름', en: 'Name' },
    'sidebar.imageUrl': { ko: '이미지 URL', en: 'Image URL' },
    'sidebar.description': { ko: '설명', en: 'Description' },
    'sidebar.relationships': { ko: '관계', en: 'Relationships' },
    'sidebar.addRelationship': { ko: '관계 추가', en: 'Add Relationship' },
    'sidebar.selectTarget': { ko: '대상 선택...', en: 'Select target...' },
    'sidebar.relationshipName': { ko: '관계명 (예: 친구)', en: 'Relationship (e.g., Friend)' },
    'sidebar.score': { ko: '점수', en: 'Score' },
    'sidebar.createRelationship': { ko: '관계 생성', en: 'Create Relationship' },
    'sidebar.enterName': { ko: '이름 입력', en: 'Enter name' },
    'sidebar.enterDescription': { ko: '설명을 입력하세요...', en: 'Enter description...' },
    'sidebar.noDescription': { ko: '설명이 없습니다.', en: 'No description.' },
    'sidebar.delete': { ko: '삭제', en: 'Delete' },
    'sidebar.pin': { ko: '위치 고정', en: 'Pin Position' },
    'sidebar.unpin': { ko: '고정 해제', en: 'Unpin' },
    'sidebar.deleteConfirm': { ko: '정말로 이 노드를 삭제하시겠습니까?', en: 'Are you sure you want to delete this node?' },
    'sidebar.to': { ko: '→ 대상', en: '→ To' },
    'sidebar.from': { ko: '← 출처', en: '← From' },

    // Edit Mode Dashboard
    'dashboard.title': { ko: '편집 모드', en: 'Edit Mode' },
    'dashboard.instruction': { ko: '목록에서 대상을 선택하거나 그래프의 노드를 클릭하여 수정하세요.', en: 'Select an item from the list or click a node in the graph to edit.' },
    'dashboard.allItems': { ko: '전체 목록', en: 'All Items' },
    'dashboard.noData': { ko: '등록된 데이터가 없습니다.', en: 'No data registered.' },

    // Empty State
    'empty.instruction': { ko: '노드를 클릭하여 상세 정보를 확인하세요.', en: 'Click a node to view details.' },

    // Types
    'type.character': { ko: '인물', en: 'Character' },
    'type.location': { ko: '장소', en: 'Location' },
    'type.event': { ko: '사건', en: 'Event' },

    // Legend
    'legend.title': { ko: '범례', en: 'Legend' },
    'legend.character': { ko: '인물', en: 'Character' },
    'legend.location': { ko: '장소', en: 'Location' },
    'legend.event': { ko: '사건', en: 'Event' },

    // Graph controls
    'graph.zoomDrag': { ko: '마우스 휠: 줌 / 드래그: 이동', en: 'Mouse wheel: Zoom / Drag: Pan' },

    // Default relationship labels
    'rel.friend': { ko: '친구', en: 'Friend' },
    'rel.enemy': { ko: '적대', en: 'Enemy' },
    'rel.family': { ko: '가족', en: 'Family' },
    'rel.colleague': { ko: '동료', en: 'Colleague' },
    'rel.lover': { ko: '연인', en: 'Lover' },
    'rel.rival': { ko: '라이벌', en: 'Rival' },
    'rel.mentor': { ko: '스승', en: 'Mentor' },
    'rel.student': { ko: '제자', en: 'Student' },
    'rel.new': { ko: '새 관계', en: 'New Rel' },

    // New node default
    'node.newCharacter': { ko: '새 인물', en: 'New Character' },
    'node.newRole': { ko: '새 역할', en: 'New Role' },

    // Toolbar additional
    'toolbar.importSuccess': { ko: '데이터를 성공적으로 불러왔습니다.', en: 'Data loaded successfully.' },
    'toolbar.importError': { ko: '데이터를 불러오는 중 오류가 발생했습니다.', en: 'Error loading data.' },
    'toolbar.resetConfirm': { ko: '모든 데이터를 초기 상태로 되돌리시겠습니까?', en: 'Reset all data to initial state?' },
    'toolbar.resetDone': { ko: '초기화되었습니다.', en: 'Data has been reset.' },
    'toolbar.editEnd': { ko: '편집 종료', en: 'End Edit' },

    // Empty state
    'empty.noData': { ko: '데이터 없음', en: 'No Data' },
    'empty.noDataDesc': { ko: '인물 관계도를 표시할 데이터가 없습니다.', en: 'No data to display the relationship graph.' },

    // Help/Manual
    'help.title': { ko: '사용법', en: 'How to Use' },
    'help.nodeClick': { ko: '노드 클릭', en: 'Click Node' },
    'help.nodeClickDesc': { ko: '노드를 클릭하면 사이드바가 열려 정보를 편집할 수 있습니다.', en: 'Click a node to open the sidebar and edit its information.' },
    'help.nodeDrag': { ko: '노드 드래그', en: 'Drag Node' },
    'help.nodeDragDesc': { ko: '노드를 드래그하여 위치를 이동하면 자동으로 고정됩니다.', en: 'Drag a node to move it, and it will automatically be pinned.' },
    'help.affinityScore': { ko: '친밀도 점수', en: 'Affinity Score' },
    'help.affinityScoreDesc': { ko: '-100~+100 범위. 높을수록 노드가 가까이, 낮을수록 멀리 배치됩니다.', en: 'Range: -100 to +100. Higher scores place nodes closer together.' },
    'help.open': { ko: '도움말 열기', en: 'Open Help' },
    'help.close': { ko: '도움말 닫기', en: 'Close Help' },
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>('ko');

    const t = (key: string): string => {
        const translation = translations[key];
        if (!translation) return key;
        return translation[language] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
