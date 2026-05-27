import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Subscriber, SubscriberDocument } from './schemas/subscriber.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import { Skill, SkillDocument } from 'src/skills/schemas/skill.schema';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectModel(Subscriber.name)
    private readonly subscriberModel: SoftDeleteModel<SubscriberDocument>,
    @InjectModel(Skill.name)
    private readonly skillModel: SoftDeleteModel<SkillDocument>,
  ) {}

  // Create new skills from user-suggested names
  private async createNewSkills(skillNames: string[], user: IUser): Promise<string[]> {
    const createdSkillIds: string[] = [];

    for (const name of skillNames) {
      const normalizedName = name.trim().toUpperCase();
      if (!normalizedName) continue;

      // Check if skill already exists
      const existingSkill = await this.skillModel.findOne({ name: normalizedName });
      if (existingSkill) {
        createdSkillIds.push(existingSkill._id.toString());
      } else {
        // Create new skill
        const newSkill = await this.skillModel.create({
          name: normalizedName,
          createdBy: {
            _id: user._id,
            email: user.email,
          },
        });
        createdSkillIds.push(newSkill._id.toString());
      }
    }

    return createdSkillIds;
  }

  async createOrUpdate(createSubscriberDto: CreateSubscriberDto, user: IUser) {
    let allSkillIds: string[] = [...(createSubscriberDto.skills || [])];

    // Create new skills if user suggested any
    if (createSubscriberDto.newSkillNames && createSubscriberDto.newSkillNames.length > 0) {
      const newSkillIds = await this.createNewSkills(createSubscriberDto.newSkillNames, user);
      allSkillIds = [...allSkillIds, ...newSkillIds];
    }

    // Validate all skill IDs
    for (const skillId of allSkillIds) {
      if (!mongoose.Types.ObjectId.isValid(skillId)) {
        throw new BadRequestException(`Invalid skill ID: ${skillId}`);
      }
    }

    // Check if user already has a subscription
    const existingSubscription = await this.subscriberModel.findOne({
      userId: user._id,
      isDeleted: false,
    });

    if (existingSubscription) {
      // Update existing subscription
      await this.subscriberModel.updateOne(
        { _id: existingSubscription._id },
        {
          skills: allSkillIds,
          email: createSubscriberDto.email || user.email,
          isActive: createSubscriberDto.isActive ?? existingSubscription.isActive,
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
      );
      return this.getSubscriberByUserId(user._id);
    }

    // Create new subscription
    const result = await this.subscriberModel.create({
      userId: user._id,
      email: createSubscriberDto.email || user.email,
      skills: allSkillIds,
      isActive: createSubscriberDto.isActive ?? true,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });
    return result;
  }

  async create(createSubscriberDto: CreateSubscriberDto) {
    if (!createSubscriberDto.skills || createSubscriberDto.skills.length === 0) {
      const usr = await this.subscriberModel.findOne({
        email: createSubscriberDto.email,
      });
      if (usr) {
        await this.subscriberModel.updateOne(
          { email: createSubscriberDto.email },
          { skills: [] },
        );
        return 'Skills updated successfully';
      } else {
        throw new BadRequestException('Skills is required');
      }
    }

    createSubscriberDto.skills.forEach((skill) => {
      if (!mongoose.Types.ObjectId.isValid(skill)) {
        throw new BadRequestException('Skill not found');
      }
    });

    const isExist = await this.subscriberModel.findOne({
      email: createSubscriberDto.email,
    });

    if (isExist) {
      await this.subscriberModel.updateOne(
        { email: createSubscriberDto.email },
        { skills: createSubscriberDto.skills },
      );
      return 'Skills updated successfully';
    }

    const result = await this.subscriberModel.create(createSubscriberDto);
    return result;
  }

  async update(id: string, updateSubscriberDto: UpdateSubscriberDto, user: IUser) {
    if (updateSubscriberDto.skills) {
      updateSubscriberDto.skills.forEach((skill) => {
        if (!mongoose.Types.ObjectId.isValid(skill)) {
          throw new BadRequestException('Skill not found');
        }
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Subscriber not found');
    }

    const result = await this.subscriberModel.findByIdAndUpdate(
      id,
      {
        ...updateSubscriberDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
      { new: true },
    );
    return result;
  }

  async toggleActive(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Subscriber not found');
    }

    const subscriber = await this.subscriberModel.findById(id);
    if (!subscriber) {
      throw new BadRequestException('Subscriber not found');
    }

    // Check ownership
    if (subscriber.userId?.toString() !== user._id) {
      throw new BadRequestException('You can only toggle your own subscription');
    }

    const result = await this.subscriberModel.findByIdAndUpdate(
      id,
      {
        isActive: !subscriber.isActive,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
      { new: true },
    );
    return result;
  }

  async getAll(page: number, limit: number) {
    const subscribers = await this.subscriberModel
      .find({ isActive: true, isDeleted: false })
      .populate({
        path: 'skills',
        select: { _id: 1, name: 1 },
      })
      .skip((page - 1) * limit)
      .limit(limit);
    return subscribers;
  }

  async getActiveSubscribersCount() {
    return this.subscriberModel.countDocuments({ isActive: true, isDeleted: false });
  }

  async getSubscriberByEmail(email: string) {
    const subscriber = await this.subscriberModel
      .findOne({ email, isDeleted: false })
      .populate({
        path: 'skills',
        select: { _id: 1, name: 1 },
      });
    return subscriber;
  }

  async getSubscriberByUserId(userId: string) {
    const subscriber = await this.subscriberModel
      .findOne({ userId, isDeleted: false })
      .populate({
        path: 'skills',
        select: { _id: 1, name: 1 },
      });
    return subscriber;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Subscriber not found');
    }
    // Update deletedBy first, then soft delete
    await this.subscriberModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
    return this.subscriberModel.softDelete({ _id: id });
  }

  async count() {
    return this.subscriberModel.countDocuments();
  }
}
