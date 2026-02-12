import { UsersService } from './users.service';
import { Request } from 'express';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(req: Request): Promise<{
        id: any;
        email: string;
        name: string;
        roles: string[];
    } | null>;
}
