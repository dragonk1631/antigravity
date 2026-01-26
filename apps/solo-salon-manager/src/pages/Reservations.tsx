import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Reservation } from '../types';
import { Clock, Phone, CheckCircle, XCircle } from 'lucide-react';

const Reservations: React.FC = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));

        // Real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reservationData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Reservation[];
            setReservations(reservationData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleStatusChange = async (id: string, newStatus: Reservation['status']) => {
        try {
            const resDoc = doc(db, 'reservations', id);
            await updateDoc(resDoc, { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("상태 변경 실패");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">확정됨</span>;
            case 'cancelled': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">취소됨</span>;
            default: return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">승인 대기중</span>;
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 px-2 flex justify-between items-center">
                예약 리스트
                <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-lg border">
                    총 {reservations.length}건
                </span>
            </h2>

            {reservations.length === 0 ? (
                <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-100">
                    <p className="text-gray-500">아직 접수된 예약이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reservations.map((res) => (
                        <div key={res.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 transition hover:shadow-md">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg text-gray-800">{res.customerName}</span>
                                        <span className="text-xs text-gray-400 bg-gray-50 px-1 rounded">{res.serviceType}</span>
                                    </div>
                                    <div className="flex items-center text-gray-500 text-sm gap-3">
                                        <span className="flex items-center gap-1"><Clock size={14} /> {res.date} {res.time}</span>
                                    </div>
                                </div>
                                {getStatusBadge(res.status)}
                            </div>

                            <div className="flex items-center text-gray-400 text-sm mb-4">
                                <Phone size={14} className="mr-1" /> {res.phoneNumber}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2 border-t border-gray-50">
                                {res.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleStatusChange(res.id!, 'confirmed')}
                                            className="flex-1 bg-primary text-text text-sm font-bold py-2 rounded-lg hover:bg-opacity-80 flex items-center justify-center gap-1"
                                        >
                                            <CheckCircle size={16} /> 승인/확정
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(res.id!, 'cancelled')}
                                            className="flex-1 bg-gray-100 text-gray-500 text-sm font-bold py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1"
                                        >
                                            <XCircle size={16} /> 거절
                                        </button>
                                    </>
                                )}
                                {res.status === 'confirmed' && (
                                    <button
                                        onClick={() => handleStatusChange(res.id!, 'cancelled')}
                                        className="w-full bg-gray-50 text-red-400 text-sm py-2 rounded-lg hover:bg-red-50"
                                    >
                                        예약 취소하기
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reservations;
