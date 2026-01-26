import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, Camera, Menu } from 'lucide-react';

const Layout: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
        <Link
            to={to}
            className={`flex flex-col lg:flex-row items-center lg:gap-3 p-2 lg:px-4 lg:py-3 rounded-xl transition-all duration-200 ${isActive(to)
                    ? 'text-primary lg:bg-secondary/30 lg:font-bold'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
        >
            <Icon size={24} className={isActive(to) ? "stroke-[2.5px]" : ""} />
            <span className="text-[10px] lg:text-base font-medium">{label}</span>
        </Link>
    );

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-background w-full overflow-hidden">
            {/* Desktop Sidebar (Hidden on Mobile) */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-secondary/50 h-full p-6 shadow-xl z-20">
                <div className="mb-10 px-2">
                    <h1 className="text-2xl font-extrabold text-accent flex items-center gap-2">
                        <span className="text-3xl">💅</span> 뷰티 개인비서
                    </h1>
                    <p className="text-xs text-gray-400 mt-1 ml-9">Solo Salon Manager</p>
                </div>

                <nav className="space-y-2 flex-1">
                    <NavItem to="/admin/reservations" icon={Calendar} label="예약 관리" />
                    <NavItem to="/admin/messages" icon={MessageSquare} label="AI 문자 생성" />
                    <NavItem to="/admin/insta" icon={Camera} label="인스타 포토그래퍼" />
                </nav>

                <div className="mt-auto p-4 bg-secondary/20 rounded-xl">
                    <p className="text-xs text-center text-accent font-medium">
                        Premium Plan Active ✨
                    </p>
                </div>
            </aside>

            {/* Mobile Header (Visible on Mobile) */}
            <header className="lg:hidden bg-white p-4 shadow-sm flex items-center justify-between z-10 sticky top-0">
                <h1 className="text-lg font-bold text-accent">뷰티 개인비서</h1>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <Menu size={24} />
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-10 relative">
                <div className="max-w-7xl mx-auto h-full">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation (Hidden on Desktop) */}
            <nav className="lg:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-2 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-safe">
                <NavItem to="/admin/reservations" icon={Calendar} label="예약관리" />
                <NavItem to="/admin/messages" icon={MessageSquare} label="문자생성" />
                <NavItem to="/admin/insta" icon={Camera} label="인스타봇" />
            </nav>
        </div>
    );
};

export default Layout;
