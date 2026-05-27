import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type UserCVDocument = HydratedDocument<UserCV>;

@Schema({ timestamps: true })
export class UserCV {
  @Prop({ required: true })
  url: string;

  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'OnlineCV' })
  onlineCvId: mongoose.Schema.Types.ObjectId;

  @Prop({ enum: ['pdf', 'docx', 'online'], default: 'pdf' })
  fileType: string;

  @Prop()
  parsedText: string; // Raw text extracted from uploaded file

  @Prop({ type: [String], default: [] })
  skills: string[]; // Extracted skills keywords

  @Prop({ type: [String], default: [] })
  education: string[]; // Extracted education info

  @Prop({ type: [String], default: [] })
  experience: string[]; // Extracted work experience info

  @Prop({ type: [String], default: [] })
  certificates: string[]; // Extracted certificates/certifications

  @Prop({ default: false })
  isPrimary: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  userId: mongoose.Schema.Types.ObjectId;

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

export const UserCVSchema = SchemaFactory.createForClass(UserCV);

// Index for faster queries
UserCVSchema.index({ userId: 1, isPrimary: -1 });
