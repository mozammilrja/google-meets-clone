import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { Request } from 'express';
import { RequestUser } from '../common/interfaces/request-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const user = req.user as RequestUser;
    const record = await this.usersService.findById(user.userId);

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      email: record.email,
      name: record.name,
      roles: record.roles
    };
  }
}
