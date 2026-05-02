/**
 * Call20 — Coupon & Admin Settings API Client
 * Handles all HTTP requests for coupon management and free credit settings.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

interface CouponRedemption {
    id: string;
    coupon_id: string;
    tenant_id: string;
    redeemed_at: string;
    credit_applied: number;
}

interface CouponWithRedemptions extends Coupon {
    redemptions: CouponRedemption[];
}

interface FreeCreditSettings {
    free_trial_enabled: boolean;
    free_trial_amount_usd: number;
    free_trial_expiry_days: number;
    coupon_credit_expiry_days: number;
    allow_coupon_stacking: boolean;
}

interface CouponRedeemResponse {
    success: boolean;
    message: string;
    credit_applied: number | null;
    new_balance: number | null;
}

interface CouponCheckResponse {
    valid: boolean;
    message?: string;
    code?: string;
    credit_amount_usd?: number;
    remaining_redemptions?: number;
}

// ─── Admin Coupon Endpoints ───────────────────────────────────────

export async function adminCreateCoupon(
    data: {
        code: string;
        credit_amount_usd: number;
        max_redemptions?: number;
        expiry_date?: string;
        tenant_id?: string;
    },
    adminKey: string
): Promise<Coupon> {
    const res = await fetch(`${API_BASE}/api/v1/admin/coupons`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': adminKey,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to create coupon');
    }
    return res.json();
}

export async function adminBulkCreateCoupons(
    data: {
        base_code: string;
        count: number;
        credit_amount_usd: number;
        expiry_date?: string;
    },
    adminKey: string
): Promise<Coupon[]> {
    const res = await fetch(`${API_BASE}/api/v1/admin/coupons/bulk`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': adminKey,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to bulk create coupons');
    }
    return res.json();
}

export async function adminListCoupons(
    adminKey: string,
    params?: {
        status?: string;
        limit?: number;
        offset?: number;
    }
): Promise<{ coupons: Coupon[]; total: number; limit: number; offset: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));

    const res = await fetch(
        `${API_BASE}/api/v1/admin/coupons?${queryParams.toString()}`,
        {
            headers: { 'X-Admin-Key': adminKey },
        }
    );
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to list coupons');
    }
    return res.json();
}

export async function adminGetCoupon(
    couponId: string,
    adminKey: string
): Promise<CouponWithRedemptions> {
    const res = await fetch(`${API_BASE}/api/v1/admin/coupons/${couponId}`, {
        headers: { 'X-Admin-Key': adminKey },
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to get coupon');
    }
    return res.json();
}

export async function adminUpdateCoupon(
    couponId: string,
    data: {
        credit_amount_usd?: number;
        max_redemptions?: number;
        expiry_date?: string;
        status?: string;
    },
    adminKey: string
): Promise<Coupon> {
    const res = await fetch(`${API_BASE}/api/v1/admin/coupons/${couponId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': adminKey,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update coupon');
    }
    return res.json();
}

// ─── Tenant Coupon Endpoints ──────────────────────────────────────

export async function redeemCoupon(
    code: string,
    tenantId: string
): Promise<CouponRedeemResponse> {
    const res = await fetch(`${API_BASE}/api/v1/coupons/redeem`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({ code }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to redeem coupon');
    }
    return res.json();
}

export async function checkCoupon(code: string): Promise<CouponCheckResponse> {
    const res = await fetch(`${API_BASE}/api/v1/coupons/check/${encodeURIComponent(code)}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to check coupon');
    }
    return res.json();
}

// ─── Admin Settings Endpoints ─────────────────────────────────────

export async function getFreeCreditSettings(adminKey: string): Promise<FreeCreditSettings> {
    const res = await fetch(`${API_BASE}/api/v1/admin/settings/free-credits`, {
        headers: { 'X-Admin-Key': adminKey },
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to get free credit settings');
    }
    return res.json();
}

export async function updateFreeCreditSettings(
    data: FreeCreditSettings,
    adminKey: string
): Promise<FreeCreditSettings> {
    const res = await fetch(`${API_BASE}/api/v1/admin/settings/free-credits`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': adminKey,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update free credit settings');
    }
    return res.json();
}