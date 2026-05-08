import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Input, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@frontend/contexts/AuthContext';
import { getApiErrorMessage } from '@frontend/api/api';
import { APP_ROUTES } from '@frontend/constants/routes';

const schema = z.object({
    username: z.string().trim().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

export function AdminSignInPage() {
    const { signInAdmin } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { username: '', password: '' },
    });

    const onSubmit = async (values) => {
        try {
            setSubmitting(true);
            setError(null);
            await signInAdmin(values);
            navigate(APP_ROUTES.ADMIN, { replace: true });
        } catch (err) {
            setError(getApiErrorMessage(err, 'Admin sign-in failed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen grid place-items-center p-4">
            <Card className="w-full max-w-md shadow-soft rounded-2xl">
                <Typography.Title level={3}>Admin Sign In</Typography.Title>
                <Typography.Paragraph type="secondary">
                    Sign in with an administrator account.
                </Typography.Paragraph>

                {error && <Alert type="error" showIcon className="mb-4" message={error} />}

                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <Controller
                            control={control}
                            name="username"
                            render={({ field }) => (
                                <Input
                                    placeholder="Username"
                                    autoComplete="username"
                                    value={field.value}
                                    onChange={(event) => field.onChange(event.target.value)}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                        {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
                    </div>

                    <div>
                        <Controller
                            control={control}
                            name="password"
                            render={({ field }) => (
                                <Input.Password
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    value={field.value}
                                    onChange={(event) => field.onChange(event.target.value)}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                    </div>

                    <Button type="primary" htmlType="submit" block loading={submitting}>
                        Open Admin Dashboard
                    </Button>
                </form>

                <Typography.Paragraph className="!mb-0 !mt-4">
                    Regular account? <Link to={APP_ROUTES.SIGN_IN}>Sign in as user</Link>
                </Typography.Paragraph>
            </Card>
        </div>
    );
}
