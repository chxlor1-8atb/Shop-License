
import { useState, useEffect, useCallback } from 'react';
import { showSuccess, showError } from '@/utils/alerts';

/**
 * Hook for managing dynamic schema columns
 * @param {string} tableName - The name of the table to manage (e.g., 'shops', 'licenses')
 */
export function useSchema(tableName) {
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSchema = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/schema?table=${tableName}`);
            const data = await res.json();
            if (data.success) {
                setColumns(data.columns);
            }
        } catch (error) {
            console.error('Failed to fetch schema:', error);
        } finally {
            setLoading(false);
        }
    }, [tableName]);

    useEffect(() => {
        if (tableName) {
            fetchSchema();
        }
    }, [fetchSchema, tableName]);

    const addColumn = async (columnData) => {
        try {
            const res = await fetch('/api/schema', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_name: tableName,
                    ...columnData
                })
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('เพิ่มคอลัมน์เรียบร้อยแล้ว');
                fetchSchema();
                return true;
            } else {
                showError(data.message);
                return false;
            }
        } catch (error) {
            showError(error.message);
            return false;
        }
    };

    const removeColumn = async (id) => {
        try {
            const res = await fetch(`/api/schema?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showSuccess('ลบคอลัมน์เรียบร้อยแล้ว');
                fetchSchema();
                return true;
            } else {
                showError(data.message);
                return false;
            }
        } catch (error) {
            showError(error.message);
            return false;
        }
    };

    return {
        columns,
        loading,
        fetchSchema,
        addColumn,
        removeColumn
    };
}
