import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { RoomService } from './services/room.service';
import { MediasoupGateway } from './mediasoup/mediasoup.gateway';
import { AuthService } from './services/auth.service';
import { RecordingService } from './services/recording.service';
import { logger } from './utils/logger';

@Module({
  controllers: [AppController],
  providers: [
    RoomService,
    MediasoupGateway,
    AuthService,
    RecordingService,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly recordingService: RecordingService,
  ) {}

  async onModuleInit() {
    // RoomService creates workers via its own OnModuleInit
    // Ensure recording directory exists
    await this.recordingService.ensureRecordingDirectory();
    logger.info('Media server initialized');
  }
}
