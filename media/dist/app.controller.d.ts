import { RoomService } from './services/room.service';
export declare class AppController {
    private readonly roomService;
    constructor(roomService: RoomService);
    health(): {
        status: string;
        timestamp: Date;
    };
    stats(): {
        rooms: number;
        peers: number;
        workers: number;
    };
}
//# sourceMappingURL=app.controller.d.ts.map