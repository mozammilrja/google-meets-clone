import { OnModuleInit } from '@nestjs/common';
import { RecordingService } from './services/recording.service';
export declare class AppModule implements OnModuleInit {
    private readonly recordingService;
    constructor(recordingService: RecordingService);
    onModuleInit(): Promise<void>;
}
//# sourceMappingURL=app.module.d.ts.map