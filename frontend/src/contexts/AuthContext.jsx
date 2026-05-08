import { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@frontend/api/api';
import { fetchProfile } from '@frontend/api/services/profile';

const AuthContext = createContext(null);

function normalizeSessionPayload(sessionPayload, userPayload = null) {
    if (!sessionPayload || !sessionPayload.user) return null;

    return {
        user: {
            id: sessionPayload.user.id,
            email: sessionPayload.user.email,
            role: userPayload?.role ?? sessionPayload.user.role ?? 'USER',
            accountType:
                userPayload?.accountType ??
                sessionPayload.user.account_type ??
                (String(userPayload?.role ?? sessionPayload.user.role ?? '').toUpperCase() === 'ADMIN'
                    ? 'admin'
                    : 'user'),
            adminRole: userPayload?.adminRole ?? sessionPayload.user.admin_role ?? null,
            username: userPayload?.username ?? sessionPayload.user.username ?? null,
            firstName: userPayload?.firstName ?? sessionPayload.user.user_metadata?.first_name ?? null,
            lastName: userPayload?.lastName ?? sessionPayload.user.user_metadata?.last_name ?? null,
            avatar: userPayload?.avatar ?? null,
        },
        accessToken: sessionPayload.access_token,
        tokenType: 'Bearer',
        expiresAt: sessionPayload.expires_at,
    };
}

function normalizeSessionFromAuthResponse(data) {
    if (!data || !data.session) return null;
    return normalizeSessionPayload(data.session, data.user ?? null);
}

function normalizeProfilePayload(profilePayload, sessionUser = null) {
    if (!profilePayload && !sessionUser) {
        return null;
    }

    const firstName =
        profilePayload?.first_name
        ?? profilePayload?.firstName
        ?? sessionUser?.firstName
        ?? null;
    const lastName =
        profilePayload?.last_name
        ?? profilePayload?.lastName
        ?? sessionUser?.lastName
        ?? null;
    const fullName =
        profilePayload?.full_name
        ?? profilePayload?.fullName
        ?? [firstName, lastName].filter(Boolean).join(' ')
        ?? null;
    const avatarUrl =
        profilePayload?.avatar_url
        ?? profilePayload?.avatarUrl
        ?? sessionUser?.avatar
        ?? null;

    return {
        ...(profilePayload ?? {}),
        email: profilePayload?.email ?? sessionUser?.email ?? null,
        first_name: firstName,
        last_name: lastName,
        firstName,
        lastName,
        full_name: fullName,
        fullName,
        avatar_url: avatarUrl,
        avatarUrl,
    };
}

function toUserCredentials(input, password) {
    if (typeof input === 'string') {
        return { email: input, password };
    }

    return input ?? {};
}

function toRegistrationPayload(input, password, firstName, lastName) {
    if (typeof input === 'string') {
        return {
            email: input,
            password,
            firstName,
            lastName,
            confirmPassword: password,
        };
    }

    return {
        ...(input ?? {}),
        confirmPassword: input?.confirmPassword ?? input?.password,
    };
}

export function AuthProvider({ children }) {
    const [userSession, setUserSession] = useState(null);
    const [adminSession, setAdminSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUserSession = async () => {
        try {
            const response = await api.get('/auth/session');
            const nextSession = normalizeSessionPayload(response.data?.session ?? null);
            setUserSession(nextSession);
            return nextSession;
        } catch {
            setUserSession(null);
            return null;
        }
    };

    const refreshAdminSession = async () => {
        try {
            const response = await api.get('/auth/admin/session');
            setAdminSession(normalizeSessionPayload(response.data?.session ?? null));
        } catch {
            setAdminSession(null);
        }
    };

    const refreshProfile = async (nextSession = userSession) => {
        if (!nextSession?.user) {
            setProfile(null);
            return null;
        }

        try {
            const nextProfile = await fetchProfile();
            const normalizedProfile = normalizeProfilePayload(nextProfile, nextSession.user);
            setProfile(normalizedProfile);
            return normalizedProfile;
        } catch {
            const fallbackProfile = normalizeProfilePayload(null, nextSession.user);
            setProfile(fallbackProfile);
            return fallbackProfile;
        }
    };

    const refreshSession = async () => {
        const [nextUserSession] = await Promise.all([refreshUserSession(), refreshAdminSession()]);
        await refreshProfile(nextUserSession);
    };

    useEffect(() => {
        refreshSession().finally(() => setLoading(false));
    }, []);

    const signIn = async (input, password) => {
        try {
            const response = await api.post('/auth/signin', toUserCredentials(input, password));
            const nextSession = normalizeSessionFromAuthResponse(response.data);
            setUserSession(nextSession);
            await refreshProfile(nextSession);
            toast.success('Signed in successfully');
            return { error: null };
        } catch (error) {
            return { error: { message: getApiErrorMessage(error, 'Invalid credentials. Please try again.') } };
        }
    };

    const signInAdmin = async (input) => {
        const response = await api.post('/auth/admin/signin', input);
        setAdminSession(normalizeSessionFromAuthResponse(response.data));
        toast.success('Admin signed in successfully');
    };

    const signUp = async (input, password, firstName, lastName) => {
        try {
            const response = await api.post('/auth/signup', toRegistrationPayload(input, password, firstName, lastName));
            const nextSession = normalizeSessionFromAuthResponse(response.data);
            setUserSession(nextSession);
            await refreshProfile(nextSession);
            toast.success('Account created successfully');
            return { error: null };
        } catch (error) {
            return { error: { message: getApiErrorMessage(error, 'Registration failed. Please try again.') } };
        }
    };

    const signOut = async () => {
        try {
            await api.post('/auth/signout');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Could not sign out'));
        } finally {
            setUserSession(null);
            setProfile(null);
        }
    };

    const signOutAdmin = async () => {
        try {
            await api.post('/auth/admin/signout');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Could not sign out admin'));
        } finally {
            setAdminSession(null);
        }
    };

    const updateProfile = (nextProfile) => {
        setProfile((current) =>
            normalizeProfilePayload(
                nextProfile ? { ...(current ?? {}), ...nextProfile } : current,
                userSession?.user ?? null,
            ),
        );

        return { error: null };
    };

    const value = {
        user: userSession?.user ?? null,
        adminUser: adminSession?.user ?? null,
        session: userSession,
        adminSession,
        profile,
        loading,
        signIn,
        signInAdmin,
        signUp,
        signOut,
        signOutAdmin,
        updateProfile,
        refreshSession,
        refreshUserSession,
        refreshAdminSession,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
