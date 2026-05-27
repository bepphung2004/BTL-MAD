import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type SubscriberDocument = HydratedDocument<Subscriber>;

@Schema({ timestamps: true })
export class Subscriber {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Skill' })
  skills: mongoose.Schema.Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  // Track last email sent to avoid spam
  @Prop()
  lastEmailSentAt: Date;

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

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);

// Index for efficient queries
SubscriberSchema.index({ email: 1 }, { unique: true });
SubscriberSchema.index({ userId: 1 });
SubscriberSchema.index({ isActive: 1, isDeleted: 1 });
