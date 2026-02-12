export interface JwtPayload {
    sub: string;
    email: string;
    roles: string[];
    iat?: number;
    exp?: number;
}
export declare class AuthService {
    verifyToken(token: string): JwtPayload;
    isTokenExpired(payload: JwtPayload): boolean;
}
//# sourceMappingURL=auth.service.d.ts.map