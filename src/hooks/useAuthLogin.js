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
                const data = JSON.parse(savedData);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, password]);

    const saveCredentials = (shouldRemember, user) => {
        if (shouldRemember) {
            // SECURITY: Never store passwords in localStorage, even encoded
            localStorage.setItem('rememberMe', JSON.stringify({ username: user }));
        } else {
            localStorage.removeItem('rememberMe');
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
                body: JSON.stringify({ username: currentUsername, password: currentPassword })
            });

            const data = await res.json();

            if (data.success) {
                unlockedRef.current = true;
                setUnlocked(true);
                saveCredentials(currentRememberMe, currentUsername);

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
