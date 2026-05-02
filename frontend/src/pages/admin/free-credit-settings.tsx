/**
 * Call20 — Admin Free Credit Settings Page
 * Allows admins to configure free trial amounts, expiry periods, and coupon stacking.
 */
import { useState, useEffect } from 'react';
import Head from 'next/head';

interface FreeCreditSettings {
    free_trial_enabled: boolean;
    free_trial_amount_usd: number;
    free_trial_expiry_days: number;
    coupon_credit_expiry_days: number;
    allow_coupon_stacking: boolean;
}

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || '';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminFreeCreditSettings() {
    const [settings, setSettings] = useState<FreeCreditSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch current settings
    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch(`${API_BASE}/api/v1/admin/settings/free-credits`, {
                    headers: { 'X-Admin-Key': ADMIN_KEY },
                });
                if (!res.ok) throw new Error('Failed to fetch settings');
                const data = await res.json();
                setSettings(data);
            } catch (err) {
                setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    // Save settings
    async function handleSave() {
        if (!settings) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/admin/settings/free-credits`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': ADMIN_KEY,
                },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error('Failed to save settings');
            const updated = await res.json();
            setSettings(updated);
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Loading settings...</div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Free Credit Settings — Call20 Admin</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="max-w-4xl mx-auto px-6 py-4">
                        <h1 className="text-2xl font-bold text-gray-900">Free Credit Settings</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure free trial credits, coupon expiry, and stacking rules.
                        </p>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-6 py-8">
                    {/* Alert Message */}
                    {message && (
                        <div
                            className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200'
                                }`}
                        >
                            {message.text}
                        </div>
                    )}

                    {/* Settings Form */}
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        {/* Free Trial Enabled */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-base font-semibold text-gray-900">
                                    Enable Free Trial Credits
                                </label>
                                <p className="text-sm text-gray-500 mt-1">
                                    Automatically apply free credits to new tenant accounts.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings?.free_trial_enabled ?? true}
                                    onChange={(e) =>
                                        setSettings((prev) =>
                                            prev ? { ...prev, free_trial_enabled: e.target.checked } : prev
                                        )
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <hr />

                        {/* Free Trial Amount */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Free Trial Amount (USD)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1000"
                                    value={settings?.free_trial_amount_usd ?? 10}
                                    onChange={(e) =>
                                        setSettings((prev) =>
                                            prev
                                                ? { ...prev, free_trial_amount_usd: parseFloat(e.target.value) || 0 }
                                                : prev
                                        )
                                    }
                                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Amount credited to new tenants on signup.</p>
                        </div>

                        {/* Free Trial Expiry */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Free Trial Expiry (Days)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={settings?.free_trial_expiry_days ?? 45}
                                onChange={(e) =>
                                    setSettings((prev) =>
                                        prev
                                            ? { ...prev, free_trial_expiry_days: parseInt(e.target.value) || 1 }
                                            : prev
                                    )
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Credits expire this many days after being applied.
                            </p>
                        </div>

                        {/* Coupon Credit Expiry */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Coupon Credit Expiry (Days)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={settings?.coupon_credit_expiry_days ?? 45}
                                onChange={(e) =>
                                    setSettings((prev) =>
                                        prev
                                            ? {
                                                ...prev,
                                                coupon_credit_expiry_days: parseInt(e.target.value) || 1,
                                            }
                                            : prev
                                    )
                                }
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Coupon credits expire this many days after redemption.
                            </p>
                        </div>

                        {/* Allow Coupon Stacking */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-base font-semibold text-gray-900">
                                    Allow Coupon Stacking
                                </label>
                                <p className="text-sm text-gray-500 mt-1">
                                    Allow tenants to redeem multiple coupons on the same account.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings?.allow_coupon_stacking ?? false}
                                    onChange={(e) =>
                                        setSettings((prev) =>
                                            prev ? { ...prev, allow_coupon_stacking: e.target.checked } : prev
                                        )
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>

                    {/* Info Box */}
                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">⚠️ Important Notes</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Changes only affect <strong>new</strong> signups and coupon redemptions.</li>
                            <li>• Existing credits are not retroactively adjusted.</li>
                            <li>• The daily expiry job runs automatically to process expired credits.</li>
                        </ul>
                    </div>
                </main>
            </div>
        </>
    );
}