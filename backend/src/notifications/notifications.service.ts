import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Notification, NotificationDocument, NotificationType, NotificationTargetType } from './schemas/notification.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import { IUser } from 'src/users/users.interface';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: SoftDeleteModel<NotificationDocument>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const { userId, title, content, type, targetType, targetId, data } = createNotificationDto;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('User not found');
    }

    const notification = await this.notificationModel.create({
      user: userId,
      title,
      content,
      type: type || NotificationType.SYSTEM,
      targetType: targetType || NotificationTargetType.NONE,
      targetId: targetId || null,
      data,
    });

    // Gửi socket tới user
    this.notificationsGateway.sendToUser(userId, 'notification', notification);

    return notification;
  }

  async createBulk(
    userIds: string[],
    title: string,
    content: string,
    type: NotificationType = NotificationType.SYSTEM,
    targetType: NotificationTargetType = NotificationTargetType.NONE,
    targetId?: string,
    data?: Record<string, any>,
  ) {
    const notifications = userIds.map((userId) => ({
      user: new mongoose.Types.ObjectId(userId),
      title,
      content,
      type,
      targetType,
      targetId: targetId || null,
      data,
    }));

    const result = await this.notificationModel.insertMany(notifications);
    // Gửi socket tới từng user
    userIds.forEach((userId, idx) => {
      this.notificationsGateway.sendToUser(userId, 'notification', result[idx]);
    });
    return result;
  }

  async findByUser(userId: string, page: number, limit: number) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('User not found');
    }

    const notifications = await this.notificationModel
      .find({ user: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.notificationModel.countDocuments({
      user: userId,
      isDeleted: false,
    });

    const unreadCount = await this.notificationModel.countDocuments({
      user: userId,
      isRead: false,
      isDeleted: false,
    });

    return {
      result: notifications,
      meta: {
        current: page,
        pageSize: limit,
        pages: Math.ceil(total / limit),
        total,
        unreadCount,
      },
    };
  }

  async markAsRead(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Notification not found');
    }

    return this.notificationModel.findOneAndUpdate(
      { _id: id, user: user._id },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAllAsRead(user: IUser) {
    return this.notificationModel.updateMany(
      { user: user._id, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Notification not found');
    }

    return this.notificationModel.softDelete({
      _id: new mongoose.Types.ObjectId(id),
      user: new mongoose.Types.ObjectId(user._id),
    });
  }

  async getUnreadCount(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('User not found');
    }

    return this.notificationModel.countDocuments({
      user: userId,
      isRead: false,
      isDeleted: false,
    });
  }
}
