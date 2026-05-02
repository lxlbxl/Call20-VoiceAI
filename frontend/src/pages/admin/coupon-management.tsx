/**
 * Call20 — Admin Coupon Management Page
 * Full CRUD interface for managing promotional coupons.
 */
import { useState, useEffect } from 'react';
import Head from 'next/head';

interface Coupon {
    id: string;
    code: string;
    credit_amount_usd: number;
    max_redemptions: number;
    used_count: number;
    expiry_date: string | null;
    tenant_id: string | null;
    status: 'active' | 'expired' | 'disabled';
    created_by: string;
    created_at: string;
    updated_at: string;
}

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || '';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Tab = 'list' | 'create' | 'bulk';

export default function AdminCouponManagement() {
    const [activeTab, setActiveTab] = useState<Tab>('list');
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(0);
    const limit = 20;

    // Create form state
    const [createCode, setCreateCode] = useState('');
    const [createAmount, setCreateAmount] = useState(10);
    const [createMaxRedemptions, setCreateMaxRedemptions] = useState(1);
    const [createExpiry, setCreateExpiry] = useState('');

    // Bulk form state
    const [bulkBaseCode, setBulkBaseCode] = useState('');
    const [bulkCount, setBulkCount] = useState(100);
    const [bulkAmount, setBulkAmount] = useState(10);
    const [bulkExpiry, setBulkExpiry] = useState('');

    // Fetch coupons
    async function fetchCoupons() {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(page * limit),
            });
            if (statusFilter) params.set('status', statusFilter);

            const res = await fetch(`${API_BASE}/api/v1/admin/coupons?${params.toString()}`, {
                headers: { 'X-Admin-Key': ADMIN_KEY },
            });
            if (!res.ok) throw new Error('Failed to fetch coupons');
            const data = await res.json();
            setCoupons(data.coupons);
            setTotal(data.total);
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCoupons();
    }, [page, statusFilter]);

    // Create single coupon
    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/admin/coupons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': ADMIN_KEY,
                },
                body: JSON.stringify({
                    code: createCode,
                    credit_amount_usd: createAmount,
                    max_redemptions: createMaxRedemptions,
                    expiry_date: createExpiry || null,
                }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Failed to create coupon');
            }
            setMessage({ type: 'success', text: 'Coupon created successfully!' });
            setCreateCode('');
            setCreateAmount(10);
            setCreateMaxRedemptions(1);
            setCreateExpiry('');
            setActiveTab('list');
            fetchCoupons();
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
            setLoading(false);
        }
    }

    // Bulk create coupons
    async function handleBulkCreate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/admin/coupons/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': ADMIN_KEY,
                },
                body: JSON.stringify({
                    base_code: bulkBaseCode,
                    count: bulkCount,
                    credit_amount_usd: bulkAmount,
                    expiry_date: bulkExpiry || null,
                }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Failed to bulk create coupons');
            }
            const created = await res.json();
            setMessage({ type: 'success', text: `${created.length} coupons created successfully!` });
            setBulkBaseCode('');
            setBulkCount(100);
            setBulkAmount(10);
            setBulkExpiry('');
            setActiveTab('list');
            fetchCoupons();
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
            setLoading(false);
        }
    }

    // Update coupon status
    async function updateCouponStatus(couponId: string, status: string) {
        try {
            const res = await fetch(`${API_BASE}/api/v1/admin/coupons/${couponId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': ADMIN_KEY,
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error('Failed to update coupon');
            fetchCoupons();
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
        }
    }

    const totalPages = Math.ceil(total / limit);

    return (
        <>
            <Head>
                <title>Coupon Management — Call20 Admin</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="max-w-6xl mx-auto px-6 py-4">
                        <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Create, manage, and track promotional coupons.
                        </p>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-6 py-8">
                    {/* Alert Message */}
                    {message && (
                        <div
                            className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                                }`}
                        >
                            {message.text}
                            <button
                                onClick={() => setMessage(null)}
                                className="ml-4 text-sm underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
                        {([
                            { key: 'list', label: 'All Coupons' },
                            { key: 'create', label: 'Create Single' },
                            { key: 'bulk', label: 'Bulk Generate' },
                        ] as const).map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* List Tab */}
                    {activeTab === 'list' && (
                        <div className="bg-white rounded-xl shadow-sm border">
                            {/* Filters */}
                            <div className="p-4 border-b flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700">Status:</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(0);
                                    }}
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="active">Active</option>
                                    <option value="expired">Expired</option>
                                    <option value="disabled">Disabled</option>
                                </select>
                                <span className="text-sm text-gray-500 ml-auto">
                                    Total: {total} coupons
                                </span>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Credit</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Used / Max</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {coupons.map((coupon) => (
                                            <tr key={coupon.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-mono text-sm">{coupon.code}</td>
                                                <td className="px-4 py-3 text-sm">${coupon.credit_amount_usd.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {coupon.used_count} / {coupon.max_redemptions}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {coupon.expiry_date
                                                        ? new Date(coupon.expiry_date).toLocaleDateString()
                                                        : 'No expiry'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${coupon.status === 'active'
                                                                ? 'bg-green-100 text-green-800'
                                                                : coupon.status === 'expired'
                                                                    ? 'bg-gray-100 text-gray-600'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}
                                                    >
                                                        {coupon.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        {coupon.status === 'active' && (
                                                            <button
                                                                onClick={() => updateCouponStatus(coupon.id, 'disabled')}
                                                                className="text-xs text-red-600 hover:text-red-800"
                                                            >
                                                                Disable
                                                            </button>
                                                        )}
                                                        {coupon.status !== 'active' && (
                                                            <button
                                                                onClick={() => updateCouponStatus(coupon.id, 'active')}
                                                                className="text-xs text-green-600 hover:text-green-800"
                                                            >
                                                                Enable
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {coupons.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                    No coupons found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t flex items-center justify-between">
                                    <button
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-600">
                                        Page {page + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Create Single Tab */}
                    {activeTab === 'create' && (
                        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
                            <h2 className="text-lg font-semibold mb-4">Create Single Coupon</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Coupon Code
                                    </label>
                                    <input
                                        type="text"
                                        value={createCode}
                                        onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                                        placeholder="SUMMER2024"
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Credit Amount (USD)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max="1000"
                                            value={createAmount}
                                            onChange={(e) => setCreateAmount(parseFloat(e.target.value) || 0)}
                                            required
                                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Redemptions
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100000"
                                        value={createMaxRedemptions}
                                        onChange={(e) => setCreateMaxRedemptions(parseInt(e.target.value) || 1)}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiry Date (optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={createExpiry}
                                        onChange={(e) => setCreateExpiry(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Create Coupon'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Bulk Generate Tab */}
                    {activeTab === 'bulk' && (
                        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
                            <h2 className="text-lg font-semibold mb-4">Bulk Generate Coupons</h2>
                            <form onSubmit={handleBulkCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Base Code
                                    </label>
                                    <input
                                        type="text"
                                        value={bulkBaseCode}
                                        onChange={(e) => setBulkBaseCode(e.target.value.toUpperCase())}
                                        placeholder="PROMO"
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg font-mono"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Will generate: PROMO001, PROMO002, ...
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Number of Coupons
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10000"
                                        value={bulkCount}
                                        onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Credit Amount per Coupon (USD)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max="1000"
                                            value={bulkAmount}
                                            onChange={(e) => setBulkAmount(parseFloat(e.target.value) || 0)}
                                            required
                                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiry Date (optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={bulkExpiry}
                                        onChange={(e) => setBulkExpiry(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Generating...' : `Generate ${bulkCount} Coupons`}
                                </button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}