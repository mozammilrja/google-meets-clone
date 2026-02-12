import { Controller, Get } from '@nestjs/common';
import { RoomService } from './services/room.service';

@Controller()
export class AppController {
  constructor(private readonly roomService: RoomService) {}

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date() };
  }

  @Get('stats')
  stats() {
    return this.roomService.getStats();
  }
}
