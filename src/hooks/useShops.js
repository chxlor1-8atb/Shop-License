/**
 * @deprecated This file is deprecated as of 2026-01-08
 * Please use useShops and useDropdownData from '@/hooks/useData' instead.
 * The SWR-based versions provide better caching and deduplication.
 * 
 * This file will be removed in a future update.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { API_ENDPOINTS } from '@/constants';
import { showSuccess, showError, confirmDelete } from '@/utils/alerts';

/**
 * Custom hook for dropdown data (shops, license types)
 * Fetches reference data for forms and filters
 */
export function useDropdownData() {
    const [shops, setShops] = useState([]);
    const [licenseTypes, setLicenseTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDropdowns = useCallback(async () => {
        setLoading(true);
        try {
            const [shopsRes, typesRes] = await Promise.all([
                fetch(`${API_ENDPOINTS.SHOPS}?limit=1000`),
                fetch(API_ENDPOINTS.LICENSE_TYPES)
            ]);

            const shopsData = await shopsRes.json();
            const typesData = await typesRes.json();

            if (shopsData.success) setShops(shopsData.shops || []);
            if (typesData.success) setLicenseTypes(typesData.types || []);
        } catch (error) {
            console.error('Failed to load dropdowns:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDropdowns();
    }, [fetchDropdowns]);

    // Pre-formatted options for CustomSelect
    const shopOptions = shops.map(s => ({
        value: s.id,
        label: s.shop_name || s.name
    }));

    const typeOptions = licenseTypes.map(t => ({
        value: t.id,
        label: t.name
    }));

    return {
        shops,
        licenseTypes,
        shopOptions,
        typeOptions,
        loading,
        refetch: fetchDropdowns
    };
}

/**
 * Custom hook for shops CRUD
 */
export function useShops({ page, limit, search }) {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchShops = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit, search: search || '' });
            const response = await fetch(`${API_ENDPOINTS.SHOPS}?${params}`);
            const data = await response.json();

            if (data.success) {
                setShops(data.shops);
                return data.pagination;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
        return null;
    }, [page, limit, search]);

    const createShop = useCallback(async (formData) => {
        try {
            const response = await fetch(API_ENDPOINTS.SHOPS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                showSuccess(data.message);
                await fetchShops();
                return true;
            }
            showError(data.message);
            return false;
        } catch (err) {
            showError(err.message);
            return false;
        }
    }, [fetchShops]);

    const updateShopField = useCallback(async (shopId, field, value) => {
        const shop = shops.find(s => s.id === shopId);
        if (!shop) throw new Error('Shop not found');

        const updateData = {
            id: shopId,
            shop_name: shop.shop_name || shop.name,
            owner_name: shop.owner_name,
            phone: shop.phone,
            [field]: value
        };

        const response = await fetch(API_ENDPOINTS.SHOPS, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const data = await response.json();

        if (data.success) {
            await fetchShops();
            return true;
        }
        throw new Error(data.message);
    }, [shops, fetchShops]);

    const deleteShop = useCallback(async (id) => {
        const confirmed = await confirmDelete('ข้อมูลร้านค้า');
        if (!confirmed) return false;

        try {
            const response = await fetch(`${API_ENDPOINTS.SHOPS}?id=${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                showSuccess(data.message);
                // Revalidate data immediately after successful delete
                await fetchShops();
                return true;
            }
            showError(data.message);
            return false;
        } catch (err) {
            showError(err.message);
            return false;
        }
    }, [fetchShops]);

    return {
        shops,
        loading,
        error,
        fetchShops,
        createShop,
        updateShopField,
        deleteShop,
        refetch: fetchShops
    };
}

export default useShops;
