import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Reservation } from '../types';
import { Sparkles, Calendar, Clock, User, Phone, CheckCircle } from 'lucide-react';

const Book: React.FC = () => {
    const [formData, setFormData] = useState({
        customerName: '',
        phoneNumber: '',
        date: '',
        time: '',
        serviceType: '네일아트', // Default value
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const newReservation: Omit<Reservation, 'id'> = {
                ...formData,
                status: 'pending',
                createdAt: Date.now(),
            };

            // 5초 타임아웃 적용
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000)
            );

            await Promise.race([
                addDoc(collection(db, 'reservations'), newReservation),
                timeoutPromise
            ]);

            setSuccess(true);
            setFormData({ customerName: '', phoneNumber: '', date: '', time: '', serviceType: '네일아트' });
        } catch (error) {
            console.error('Error adding document: ', error);
            if (error instanceof Error && error.message === "Timeout") {
                alert('서버 응답 시간이 초과되었습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.');
            } else {
                alert('예약 요청 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-secondary to-white flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-10 rounded-2xl shadow-xl max-w-sm w-full border border-secondary/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent"></div>
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 mx-auto text-green-500">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 font-serif">예약 요청 완료</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        고객님의 예약이 무사히 접수되었습니다.<br />
                        원장님 확인 후 <strong className="text-primary">확정 문자</strong>를 보내드립니다.
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition shadow-lg transform active:scale-95"
                    >
                        추가 예약하기
                    </button>
                    <p className="mt-6 text-xs text-gray-300">Solo Salon Manager</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-background to-white py-12 px-4 flex flex-col items-center justify-center">

            {/* Header / Brand */}
            <div className="text-center mb-8">
                <div className="inline-block p-3 bg-white rounded-full shadow-md mb-4 animate-bounce">
                    <span className="text-4xl">💅</span>
                </div>
                <h1 className="text-3xl font-extrabold text-accent font-serif tracking-tight">
                    뷰티 개인비서
                </h1>
                <p className="text-gray-500 mt-2 text-sm uppercase tracking-widest">Premium Beauty Salon</p>
            </div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-accent text-white px-6 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-2">
                    <Sparkles size={16} /> 예약하기
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 group-focus-within:text-primary transition-colors">NAME</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="text"
                                    name="customerName"
                                    required
                                    placeholder="고객명 (홍길동)"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-secondary focus:border-primary outline-none transition-all font-medium text-gray-700"
                                    value={formData.customerName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 group-focus-within:text-primary transition-colors">PHONE</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    required
                                    placeholder="010-1234-5678"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-secondary focus:border-primary outline-none transition-all font-medium text-gray-700"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 group-focus-within:text-primary transition-colors">DATE</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                                    <input
                                        type="date"
                                        name="date"
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-secondary focus:border-primary outline-none transition-all font-medium text-gray-700 text-sm"
                                        value={formData.date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 group-focus-within:text-primary transition-colors">TIME</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                                    <select
                                        name="time"
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-secondary focus:border-primary outline-none transition-all font-medium text-gray-700 appearance-none text-sm"
                                        value={formData.time}
                                        onChange={handleChange}
                                    >
                                        <option value="">시간 선택</option>
                                        {Array.from({ length: 61 }, (_, i) => {
                                            const totalMinutes = 10 * 60 + i * 10; // Start at 10:00 (10 * 60 min)
                                            const h = Math.floor(totalMinutes / 60);
                                            const m = totalMinutes % 60;
                                            if (h > 20) return null; // End at 20:00
                                            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                            return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                                        }).filter(Boolean)}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        ▼
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 group-focus-within:text-primary transition-colors">SERVICE</label>
                            <div className="relative">
                                <select
                                    name="serviceType"
                                    className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-secondary focus:border-primary outline-none transition-all font-medium text-gray-700 appearance-none"
                                    value={formData.serviceType}
                                    onChange={handleChange}
                                >
                                    <option value="네일아트">💅 네일아트 (Basic Care)</option>
                                    <option value="아트젤">🎨 이달의 아트 (Art Gel)</option>
                                    <option value="속눈썹">👁️ 속눈썹 연장/펌 (Eyelash)</option>
                                    <option value="페디큐어">👣 페디큐어 (Pedicure)</option>
                                    <option value="상담">💬 시술 상담 (Consulting)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    ▼
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition all duration-300 transform active:scale-95 text-lg ${loading
                            ? 'bg-gray-400 cursor-wait'
                            : 'bg-gradient-to-r from-primary to-accent hover:shadow-primary/40 hover:-translate-y-1'
                            }`}
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                                예약 처리 중...
                            </>
                        ) : (
                            <>
                                예약 요청하기
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400 font-medium">100% 예약제로 운영됩니다.</p>
                    <p className="text-xs text-gray-300 mt-1">© 2026 Solo Salon Manager</p>
                </div>
            </div>
        </div>
    );
};

export default Book;
