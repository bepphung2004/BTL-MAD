import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';

@Controller('notifications')
@ApiTags('Notifications Controller')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Get notifications')
  findByUser(
    @User() user: IUser,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.notificationsService.findByUser(
      user._id,
      +page || 1,
      +limit || 10,
    );
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Get unread count')
  getUnreadCount(@User() user: IUser) {
    return this.notificationsService.getUnreadCount(user._id);
  }


  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Mark notification as read')
  markAsRead(@Param('id') id: string, @User() user: IUser) {
    return this.notificationsService.markAsRead(id, user);
  }

  @Post('mark-all-read')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Mark all notifications as read')
  markAllAsRead(@User() user: IUser) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Delete notification')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.notificationsService.remove(id, user);
  }
}
