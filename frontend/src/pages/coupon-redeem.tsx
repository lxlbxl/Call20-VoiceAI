/**
 * Call20 — Tenant Coupon Redemption Page
 * Allows tenants to enter a coupon code and redeem credits.
 */
import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export default function CouponRedeemPage() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        credit_applied: number | null;
        new_balance: number | null;
    } | null>(null);

    async function handleRedeem(e: React.FormEvent) {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const tenantId = localStorage.getItem('tenant_id') || '';
            if (!tenantId) {
                setResult({
                    success: false,
                    message: 'Please log in to redeem a coupon.',
                    credit_applied: null,
                    new_balance: null,
                });
                return;
            }

            const res = await fetch(`${API_BASE}/payments/redeem-coupon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                },
                body: JSON.stringify({ code: code.trim() }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Failed to redeem coupon');
            }

            const data = await res.json();
            setResult(data);
        } catch (err) {
            setResult({
                success: false,
                message: err instanceof Error ? err.message : 'Unknown error',
                credit_applied: null,
                new_balance: null,
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                <svg
                                    className="w-8 h-8 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                                    />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Redeem Coupon</h1>
                            <p className="text-sm text-gray-500 mt-2">
                                Enter your coupon code to add credits to your wallet.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleRedeem} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="code"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Coupon Code
                                </label>
                                <input
                                    id="code"
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="Enter code here"
                                    disabled={loading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-center text-lg tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                    autoComplete="off"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !code.trim()}
                                className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg
                                            className="animate-spin h-5 w-5"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Redeeming...
                                    </span>
                                ) : (
                                    'Redeem Coupon'
                                )}
                            </button>
                        </form>

                        {/* Result */}
                        {result && (
                            <div
                                className={`mt-6 p-4 rounded-lg ${result.success
                                    ? 'bg-green-50 border border-green-200'
                                    : 'bg-red-50 border border-red-200'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {result.success ? (
                                        <svg
                                            className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    )}
                                    <div>
                                        <p
                                            className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'
                                                }`}
                                        >
                                            {result.message}
                                        </p>
                                        {result.success && result.credit_applied && (
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm text-green-700">
                                                    Credit applied:{' '}
                                                    <span className="font-semibold">
                                                        +${result.credit_applied.toFixed(2)}
                                                    </span>
                                                </p>
                                                {result.new_balance !== null && (
                                                    <p className="text-sm text-green-700">
                                                        New balance:{' '}
                                                        <span className="font-semibold">
                                                            ${result.new_balance.toFixed(2)}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-6">
                        Each account can redeem only one coupon. Credits expire after 45 days.
                    </p>
                </div>
            </div>
        </>
    );
}