import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateMeetingDto, @Req() req: Request) {
    const user = req.user as RequestUser;
    return this.meetingsService.createMeeting(dto, user.userId, {
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getById(@Param('id') meetingId: string) {
    return this.meetingsService.getMeetingById(meetingId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('code/:code')
  getByCode(@Param('code') code: string) {
    return this.meetingsService.getMeetingByCode(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  join(@Param('id') meetingId: string, @Body() dto: JoinMeetingDto, @Req() req: Request) {
    const user = req.user as RequestUser;
    return this.meetingsService.joinMeeting(meetingId, dto, user.userId, {
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/leave/:participantId')
  leave(@Param('id') meetingId: string, @Param('participantId') participantId: string, @Req() req: Request) {
    const user = req.user as RequestUser;
    return this.meetingsService.leaveMeeting(meetingId, participantId, user.userId, {
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });
  }
}
