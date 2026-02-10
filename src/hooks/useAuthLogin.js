import { useState, useEffect, useRef, useCallback } from 'react';
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
    const [checkingAuth, setCheckingAuth] = useState(true);
    const isSubmittingRef = useRef(false);
    const unlockedRef = useRef(false);
    const redirectTimerRef = useRef(null);
    const usernameRef = useRef(username);
    const passwordRef = useRef(password);
    const rememberMeRef = useRef(rememberMe);

    useEffect(() => { usernameRef.current = username; }, [username]);
    useEffect(() => { passwordRef.current = password; }, [password]);
    useEffect(() => { rememberMeRef.current = rememberMe; }, [rememberMe]);

    // Initial auth check
    useEffect(() => {
        router.prefetch('/dashboard');

        const verifyAuth = async () => {
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth check timeout')), 5000)
                );
                const { authenticated } = await Promise.race([checkAuth(), timeoutPromise]);
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

    // Cleanup redirect timer on unmount
    useEffect(() => {
        return () => {
            if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        };
    }, []);

    // Load credentials - Only username for security
    useEffect(() => {
        try {
            const savedData = localStorage.getItem('rememberMe');
            if (savedData) {
                const data = JSON.parse(savedData);
                // Only restore username, never password
                if (data.username) {
                    setUsername(data.username);
                    setRememberMe(true);
                }
            }
        } catch (e) {
            try { localStorage.removeItem('rememberMe'); } catch (_) { /* storage unavailable */ }
        }
    }, []);

    // Clear error on input
    useEffect(() => {
        if (error) setError('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, password]);

    const saveCredentials = (shouldRemember, user) => {
        try {
            if (shouldRemember) {
                // SECURITY: Never store passwords in localStorage, even encoded
                localStorage.setItem('rememberMe', JSON.stringify({ username: user }));
            } else {
                localStorage.removeItem('rememberMe');
            }
        } catch (e) {
            // localStorage unavailable (e.g. Safari private mode) - non-critical, skip silently
        }
    };

    const submitLogin = useCallback(async () => {
        if (isSubmittingRef.current || unlockedRef.current) return false;

        const currentUsername = usernameRef.current;
        const currentPassword = passwordRef.current;
        const currentRememberMe = rememberMeRef.current;

        if (!currentUsername || !currentPassword) {
            setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return false;
        }

        isSubmittingRef.current = true;
        setLoading(true);

        try {
            const res = await fetch('/api/auth?action=login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUsername, password: currentPassword, rememberMe: currentRememberMe })
            });

            const data = await res.json();

            if (data.success) {
                unlockedRef.current = true;
                setUnlocked(true);
                saveCredentials(currentRememberMe, currentUsername);

                redirectTimerRef.current = setTimeout(() => {
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
            isSubmittingRef.current = false;
        }
    }, [router]);

    return {
        username, setUsername,
        password, setPassword,
        showPassword, setShowPassword,
        rememberMe, setRememberMe,
        loading,
        error,
        unlocked,
        checkingAuth,
        submitLogin
    };
}
