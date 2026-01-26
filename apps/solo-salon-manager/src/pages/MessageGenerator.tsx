

import { useState } from 'react';
import { aiService } from '../services/aiService';
import { Send, Copy, Sparkles, MessageSquare } from 'lucide-react';

const scenraios = [
    "노쇼 (No-Show) 고객에게 정중한 알림",
    "예약 확정 및 방문 안내",
    "시술 후 관리법 및 안부 문자",
    "이벤트/프로모션 홍보",
    "예약 변경 요청",
    "리뷰 작성 부탁"
];

const MessageGenerator: React.FC = () => {
    const [selectedScenario, setSelectedScenario] = useState(scenraios[0]);
    const [details, setDetails] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        setResult(''); // Clear previous result
        try {
            const text = await aiService.generateMessage(selectedScenario, details);
            setResult(text);
        } catch (error) {
            console.error(error);
            alert("AI 메시지 생성 중 오류가 발생했습니다. API Key를 확인해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        alert("클립보드에 복사되었습니다!");
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-accent flex items-center gap-2">
                <MessageSquare className="text-primary" /> AI 문자 생성기
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)] min-h-[600px]">
                {/* Left: Input Section (Fixed Width) */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-secondary/50 flex flex-col gap-6 h-full col-span-1 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-sm font-bold text-accent mb-3 flex items-center gap-2">
                            <span className="bg-secondary text-accent w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            어떤 상황인가요?
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {scenraios.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSelectedScenario(s)}
                                    className={`text-left p-4 rounded-xl border transition text-sm flex items-center justify-between group ${selectedScenario === s
                                            ? 'bg-primary text-white border-primary font-bold shadow-md'
                                            : 'bg-white text-gray-600 border-gray-100 hover:bg-secondary/30 hover:border-secondary'
                                        }`}
                                >
                                    {s}
                                    {selectedScenario === s && <Sparkles size={14} className="animate-pulse" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm font-bold text-accent mb-3 flex items-center gap-2">
                            <span className="bg-secondary text-accent w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            추가 정보 (선택사항)
                        </label>
                        <textarea
                            className="w-full p-4 border border-secondary rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none h-32 bg-background/30"
                            placeholder="예: 고객명, 예약 시간, 할인율 등..."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition transform hover:-translate-y-1 active:scale-95 text-lg ${loading
                                ? 'bg-gray-300 cursor-wait'
                                : 'bg-black hover:bg-gray-800' // Keeping black for contrast as primary is pink
                            }`}
                        style={{ backgroundColor: loading ? '#d1d5db' : '#1f2937' }} // Explicit fallback
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                                작성 중...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} /> AI 메시지 생성
                            </>
                        )}
                    </button>
                </div>

                {/* Right: Result Section (Wide) */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-secondary/50 flex flex-col h-full col-span-1 lg:col-span-2 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                            <span className="bg-secondary text-accent w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                            생성된 메시지
                        </h3>
                        {result && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition"
                                >
                                    <Copy size={16} /> 복사
                                </button>
                                <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition shadow-md">
                                    <Send size={16} /> 전송
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 bg-background/50 p-8 rounded-xl border border-secondary/30 shadow-inner whitespace-pre-wrap text-text leading-loose overflow-y-auto text-lg font-medium relative z-10">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-accent space-y-4 animate-pulse">
                                <MessageSquare size={48} className="animate-bounce" />
                                <div className="text-center space-y-2">
                                    <p className="text-xl font-bold">고객님에게 보낼 문자를 생각 중입니다...</p>
                                    <p className="text-sm opacity-70">정중하고 센스있는 표현을 찾고 있어요✨</p>
                                </div>
                            </div>
                        ) : result ? (
                            result
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center space-y-4">
                                <div className="p-6 bg-gray-50 rounded-full">
                                    <Sparkles size={40} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-400">상황을 선택하고 생성해보세요</p>
                                    <p className="text-gray-400 mt-2">왼쪽에서 옵션을 고르면 AI가 문자를 대신 써드립니다.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
                </div>
            </div>
        </div>
    );
};

export default MessageGenerator;
