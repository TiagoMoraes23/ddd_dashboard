import React from 'react';

export default function KpiCard({ title, value, icon, color, onClick, animationDelay }) {
    const colorClasses = {
        green: 'from-green-500 to-green-600',
        blue: 'from-blue-500 to-blue-600',
        yellow: 'from-yellow-500 to-yellow-600',
        red: 'from-red-500 to-red-600',
        purple: 'from-purple-500 to-purple-600',
        indigo: 'from-indigo-500 to-indigo-600',
    };
    return (
        <div 
            onClick={onClick}
            className={`bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} p-6 rounded-lg text-white shadow-lg cursor-pointer transform hover:scale-110 hover:shadow-2xl transition-all duration-300 animate-slide-in-up`}
            style={{ animationDelay: `${animationDelay * 100}ms`}}
        >
            <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <p className="text-lg font-semibold opacity-80">{title}</p>
                    <p className="text-4xl font-bold">{value}</p>
                </div>
                <div className={`p-3 rounded-full bg-white bg-opacity-20`}>{icon}</div>
            </div>
        </div>
    );
}