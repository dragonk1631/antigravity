export interface Reservation {
    id?: string;
    customerName: string;
    phoneNumber: string;
    date: string;
    time: string;
    serviceType: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    createdAt: number;
}
