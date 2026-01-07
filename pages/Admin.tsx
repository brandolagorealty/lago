import React, { useState } from 'react';
import PropertyForm from '../components/PropertyForm';
import { Property } from '../types';
import { propertyService } from '../services/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const Admin: React.FC = () => {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleSaveProperty = async (property: Property) => {
        // Admin properties are published immediately (is_published: true)
        const { id, ...propertyData } = property;
        const result = await propertyService.createProperty(propertyData, true);

        if (result.success) {
            alert('Property published successfully!');
            setShowForm(false);
        } else {
            alert('Error publishing property: ' + result.error?.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img
                        src="/assets/logo.png"
                        alt="Lago Realty"
                        className="h-16 w-auto object-contain"
                    />
                    <span className="text-xl font-bold text-blue-600">Admin</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">{user?.email}</span>
                    <button onClick={handleLogout} className="text-sm font-bold text-red-600 hover:text-red-700">
                        Sign Out
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-serif font-bold text-slate-900">Dashboard</h2>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        + Add New Property
                    </button>
                </div>

                {/* Empty state or list could go here */}
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome Back</h3>
                    <p className="text-slate-500">Manage your real estate listings from this secure portal.</p>
                </div>
            </div>

            {showForm && (
                <PropertyForm
                    onClose={() => setShowForm(false)}
                    onSave={handleSaveProperty}
                />
            )}
        </div>
    );
};

export default Admin;
