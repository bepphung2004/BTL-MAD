import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  JOB = 'JOB',
  RESUME = 'RESUME',
  COMPANY = 'COMPANY',
  SYSTEM = 'SYSTEM',
  APPLICATION = 'APPLICATION',
}

// Target types for navigation
export enum NotificationTargetType {
  JOB = 'job',
  COMPANY = 'company',
  APPLICATION = 'application',
  USER = 'user',
  NONE = 'none',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  content: string;

  @Prop({ type: String, enum: NotificationType, default: NotificationType.SYSTEM })
  type: string;

  // Navigation target type (for mobile navigation)
  @Prop({ type: String, enum: NotificationTargetType, default: NotificationTargetType.NONE })
  targetType: string;

  // Target ID for navigation (jobId, companyId, applicationId, etc.)
  @Prop()
  targetId: string;

  @Prop({ type: Object })
  data: Record<string, any>;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  deletedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, targetType: 1, createdAt: -1 });
