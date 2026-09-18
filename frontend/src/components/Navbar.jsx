import React, { useState } from 'react';
import { IconUsers, IconLogOut, IconList, IconMenu, IconX } from './Icons';

export default function Navbar({ userInfo, onLogout, onManageUsers, onSwitchToDashboard, onSwitchToPatientList }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuToggle = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className="bg-white shadow-md mb-8 animate-fade-in">
            <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-blue-600 cursor-pointer" onClick={onSwitchToDashboard}>Dashboard 2.0 🚀</h1>
                
                {/* Desktop Menu */}
                <div className="hidden md:flex items-center">
                    <button onClick={onSwitchToPatientList} className="flex items-center gap-2 text-gray-600 hover:bg-gray-200 font-semibold py-2 px-4 rounded-lg mr-4 transition-all duration-200 transform active:scale-95">
                        <IconList />
                        Pacientes
                    </button>
                    {userInfo.role === 'admin' && (
                        <button onClick={onManageUsers} title="Gerenciar Usuários" className="text-gray-600 hover:bg-gray-200 p-2 rounded-full mr-4 transition-all duration-200 transform active:scale-95">
                            <IconUsers />
                        </button>
                    )}
                    <button onClick={onLogout} title="Sair" className="text-red-500 hover:bg-red-100 p-2 rounded-full transition-all duration-200 transform active:scale-95">
                        <IconLogOut />
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <button onClick={handleMenuToggle} className="text-gray-600 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400">
                        {isMenuOpen ? <IconX /> : <IconMenu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200">
                    <div className="p-4 space-y-2">
                        <button onClick={() => { onSwitchToPatientList(); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 text-gray-600 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"><IconList />Pacientes</button>
                        {userInfo.role === 'admin' && (<button onClick={() => { onManageUsers(); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 text-gray-600 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"><IconUsers />Gerenciar Usuários</button>)}
                        <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 text-red-500 hover:bg-red-100 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"><IconLogOut />Sair</button>
                    </div>
                </div>
            )}
        </nav>
    );
}