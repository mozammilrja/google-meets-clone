import { Strategy } from 'passport-jwt';
import { RequestUser } from '../common/interfaces/request-user.interface';
interface JwtPayload {
    sub: string;
    email: string;
    roles: string[];
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): RequestUser;
}
export {};
