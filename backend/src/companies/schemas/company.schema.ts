import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  address: string;

  @Prop()
  logo: string;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'User' })
  usersFollow: mongoose.Schema.Types.ObjectId[];

  @Prop()
  taxCode: string;

  @Prop()
  scale: string;

  @Prop({ type: [{ userId: String, name: String, email: String, avatar: String, requestedAt: Date }], default: [] })
  pendingHrs: { userId: string; name: string; email: string; avatar?: string; requestedAt: Date }[];

  @Prop()
  updatedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;

  @Prop()
  isActive: boolean;

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

export const CompanySchema = SchemaFactory.createForClass(Company);
