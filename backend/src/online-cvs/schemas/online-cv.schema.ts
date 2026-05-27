import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type OnlineCVDocument = HydratedDocument<OnlineCV>;

// Education entry
export class EducationEntry {
  @Prop()
  schoolName: string;

  @Prop()
  major: string;

  @Prop()
  startDate: string;

  @Prop()
  endDate: string;

  @Prop()
  description: string;
}

// Work experience entry
export class WorkExperienceEntry {
  @Prop()
  companyName: string;

  @Prop()
  position: string;

  @Prop()
  startDate: string;

  @Prop()
  endDate: string;

  @Prop()
  description: string;
}

// Skill entry
export class SkillEntry {
  @Prop()
  name: string;

  @Prop()
  description: string;
}

// Activity entry
export class ActivityEntry {
  @Prop()
  organizationName: string;

  @Prop()
  position: string;

  @Prop()
  startDate: string;

  @Prop()
  endDate: string;

  @Prop()
  description: string;
}

// Certificate entry
export class CertificateEntry {
  @Prop()
  name: string;

  @Prop()
  date: string;
}

// Award entry
export class AwardEntry {
  @Prop()
  name: string;

  @Prop()
  date: string;
}

@Schema({ timestamps: true })
export class OnlineCV {
  // Template type: 'template1' or 'template2'
  @Prop({ required: true, enum: ['template1', 'template2'] })
  templateType: string;

  // Personal Information
  @Prop({ required: true })
  fullName: string;

  @Prop()
  position: string;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop()
  link: string;

  @Prop()
  address: string;

  @Prop()
  avatar: string;

  // Career Objective
  @Prop()
  careerObjective: string;

  // Education
  @Prop({ type: [Object] })
  education: EducationEntry[];

  // Work Experience
  @Prop({ type: [Object] })
  workExperience: WorkExperienceEntry[];

  // Skills
  @Prop({ type: [Object] })
  skills: SkillEntry[];

  // Activities (Template 1)
  @Prop({ type: [Object] })
  activities: ActivityEntry[];

  // Certificates (Template 2)
  @Prop({ type: [Object] })
  certificates: CertificateEntry[];

  // Awards (Template 2)
  @Prop({ type: [Object] })
  awards: AwardEntry[];

  // Generated PDF URL (stored after export)
  @Prop()
  pdfUrl: string;

  // User reference
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
}

export const OnlineCVSchema = SchemaFactory.createForClass(OnlineCV);

// Index for faster queries
OnlineCVSchema.index({ userId: 1, templateType: 1 });
