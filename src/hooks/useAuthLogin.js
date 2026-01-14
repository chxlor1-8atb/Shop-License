import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth } from '@/utils/auth';

export function useAuthLogin() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [unlocked, setUnlocked] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Initial auth check
    useEffect(() => {
        router.prefetch('/dashboard');

        const verifyAuth = async () => {
            // ... existing verifyAuth logic
            // For brevity in this thought, I assume same logic.
            // But I must write full code.
            try {
                const { authenticated } = await checkAuth();
                if (authenticated) {
                    router.replace('/dashboard');
                } else {
                    setCheckingAuth(false);
                }
            } catch (e) {
                setCheckingAuth(false);
            }
        };
        verifyAuth();
    }, [router]);

    // Load credentials - Only username for security
    useEffect(() => {
        const savedData = localStorage.getItem('rememberMe');
        if (savedData) {
            try {
                const data = JSON.parse(atob(savedData));
                // Only restore username, never password
                if (data.username) {
                    setUsername(data.username);
                    setRememberMe(true);
                }
            } catch (e) {
                localStorage.removeItem('rememberMe');
            }
        }
    }, []);

    // Clear error on input
    useEffect(() => {
        if (error) setError('');
    }, [username, password]);

    const saveCredentials = (shouldRemember, user) => {
        if (shouldRemember) {
            // SECURITY: Never store passwords in localStorage, even encoded
            const savedData = { username: user };
            localStorage.setItem('rememberMe', btoa(JSON.stringify(savedData)));
        } else {
            localStorage.removeItem('rememberMe');
        }
    };

    const submitLogin = async () => {
        if (!username || !password) {
            setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return false;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (data.success) {
                setUnlocked(true);
                setLoginSuccess(true);
                saveCredentials(rememberMe, username);

                // Prefetch dashboard for instant navigation
                router.prefetch('/dashboard');

                setTimeout(() => {
                    router.push('/dashboard');
                }, 800);
                return true;
            } else {
                setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
                return false;
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        username, setUsername,
        password, setPassword,
        showPassword, setShowPassword,
        rememberMe, setRememberMe,
        loading,
        error,
        unlocked,
        loginSuccess,
        checkingAuth,
        submitLogin
    };
}
