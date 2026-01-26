

import { useState, useRef } from 'react';
import { aiService } from '../services/aiService';
import { Upload, Sparkles, Copy, Instagram, Image as ImageIcon, X } from 'lucide-react';

const InstaBot: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setSelectedImage(file);

        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);

        setResult(''); // New image, clear previous result
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleGenerate = async () => {
        if (!selectedImage) return;

        setLoading(true);
        setResult('');
        try {
            const text = await aiService.generateCaption(selectedImage);
            setResult(text);
        } catch (error) {
            console.error(error);
            alert("AI 캡션 생성 중 오류가 발생했습니다. API Key를 확인해주세요.");
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
                <Instagram className="text-primary" /> 인스타 포토그래퍼
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)] min-h-[600px]">
                {/* Left: Upload Section (Fixed Width) */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-secondary/50 flex flex-col gap-4 h-full col-span-1">
                    <div
                        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group ${previewUrl ? 'border-primary bg-background' : 'border-gray-300 hover:border-primary hover:bg-background'
                            }`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {previewUrl ? (
                            <>
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">
                                    클릭하여 사진 변경
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setPreviewUrl(null); }}
                                    className="absolute top-2 right-2 bg-white text-gray-800 p-2 rounded-full shadow-md hover:bg-red-50 hover:text-red-500"
                                >
                                    <X size={20} />
                                </button>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 p-4">
                                <Upload size={48} className="mx-auto mb-3 opacity-50 text-accent" />
                                <p className="font-bold text-lg text-text">사진을 올려주세요</p>
                                <p className="text-sm mt-1 text-gray-400">드래그 또는 클릭</p>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="bg-secondary/30 p-4 rounded-xl text-sm text-text">
                            <p className="font-bold mb-1 flex items-center gap-1 text-accent"><Sparkles size={14} /> Expert Tip</p>
                            <p>시술 부위가 잘 보이게 찍으면, <span className="font-bold text-primary">Gemini AI</span>가 더 정확하고 감성적인 멘트를 추천해요.</p>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading || !selectedImage}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition transform hover:-translate-y-1 active:scale-95 text-lg ${loading || !selectedImage
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary to-accent hover:shadow-primary/50'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                                    분석 및 작성 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} /> 캡션 생성하기
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right: Result Section (Wide) */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-secondary/50 flex flex-col h-full col-span-1 lg:col-span-2 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon size={20} /> 추천 게시글
                        </h3>
                        {result && (
                            <button
                                onClick={handleCopy}
                                className="bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition"
                            >
                                <Copy size={16} /> 전체 복사
                            </button>
                        )}
                    </div>

                    <div className="flex-1 bg-background/50 p-6 rounded-xl border border-secondary/30 shadow-inner whitespace-pre-wrap text-text leading-loose overflow-y-auto text-lg font-medium">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-accent space-y-4 animate-pulse">
                                <Instagram size={48} className="animate-bounce" />
                                <div className="text-center space-y-2">
                                    <p className="text-xl font-bold">인스타 감성 충전 중...</p>
                                    <p className="text-sm opacity-70">사진의 분위기를 읽고 있어요✨</p>
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
                                    <p className="text-xl font-bold text-gray-400">멋진 사진을 기다리고 있어요</p>
                                    <p className="text-gray-400 mt-2">왼쪽에서 사진을 선택하고 버튼을 눌러보세요!</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
                </div>
            </div>
        </div>
    );
};

export default InstaBot;
