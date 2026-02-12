import { Module } from '@nestjs/common';
import { RoomService } from '../services/room.service';
import { MediasoupGateway } from './mediasoup.gateway';
import { AuthService } from '../services/auth.service';

@Module({
  providers: [
    RoomService,
    MediasoupGateway,
    AuthService,
  ],
  exports: [RoomService],
})
export class MediasoupModule {}
