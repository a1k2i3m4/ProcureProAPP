export interface User {
    id:string;
    email:string;
    username?: string;
    role?: string;
    createdAt?:string;
}

export interface AuthCredentials {
    email: string;
    password: string;
    username?: string;
}

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user?: User;
    expiresIn: number;
}

export interface AuthState {
    user: User | null;
    loading: boolean;
    error: Error | null;
    isAuthenticated: boolean;
}

export interface LoginResponse {
    success: boolean;
    error?: Error;
    data?: AuthResponse;
}

export interface RegisterData extends AuthCredentials {
    confirmPassword: string;
}