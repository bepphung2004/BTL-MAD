import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CVMatchResultDocument = HydratedDocument<CVMatchResult>;

export enum CVProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class CVMatchResult {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'UserCV', required: true })
  cvId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true })
  jobId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Application' })
  applicationId: mongoose.Schema.Types.ObjectId;

  @Prop()
  cvUrl: string;

  @Prop()
  cvText: string;

  @Prop({ type: [Number], default: [] })
  cvEmbedding: number[];

  @Prop({ type: Number, default: 0 })
  matchScore: number;

  @Prop({ type: [String], default: [] })
  matchedSkills: string[];

  @Prop({ type: [String], default: [] })
  missingSkills: string[];

  @Prop()
  explanation: string;

  @Prop({ 
    type: String, 
    enum: CVProcessingStatus, 
    default: CVProcessingStatus.PENDING 
  })
  status: CVProcessingStatus;

  @Prop()
  errorMessage: string;

  @Prop()
  processedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const CVMatchResultSchema = SchemaFactory.createForClass(CVMatchResult);

// Indexes for fast querying
CVMatchResultSchema.index({ jobId: 1, matchScore: -1 });
CVMatchResultSchema.index({ cvId: 1, jobId: 1 }, { unique: true });
CVMatchResultSchema.index({ applicationId: 1 });
CVMatchResultSchema.index({ userId: 1 });
CVMatchResultSchema.index({ status: 1 });
