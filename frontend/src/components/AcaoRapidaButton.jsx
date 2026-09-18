import React from 'react';

export default function AcaoRapidaButton({ title, icon, onClick }) {
    return (
        <button 
            onClick={onClick}
            className="flex items-center justify-center w-full bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 hover:shadow-lg transition-all duration-300 transform active:scale-95"
        >
            <div className="text-blue-600 mr-3">{icon}</div>
            <span className="font-semibold text-gray-700">{title}</span>
        </button>
    );
}