import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnlineCV, OnlineCVDocument } from './schemas/online-cv.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { CreateOnlineCVDto } from './dto/create-online-cv.dto';
import { UpdateOnlineCVDto } from './dto/update-online-cv.dto';
import mongoose from 'mongoose';
import { FilesService } from 'src/files/files.service';
import { UserCVsService } from 'src/usercvs/usercvs.service';
import * as Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Dynamic import for puppeteer
let puppeteer: any;

@Injectable()
export class OnlineCVsService {
  constructor(
    @InjectModel(OnlineCV.name)
    private readonly onlineCVModel: SoftDeleteModel<OnlineCVDocument>,
    private readonly filesService: FilesService,
    private readonly userCVsService: UserCVsService,
  ) {
    this.loadPuppeteer();
  }

  private async loadPuppeteer() {
    try {
      puppeteer = await import('puppeteer');
    } catch (error) {
      console.warn('Puppeteer not available for PDF generation');
    }
  }

  // Create a new online CV
  async create(createOnlineCVDto: CreateOnlineCVDto, user: IUser) {
    const newCV = await this.onlineCVModel.create({
      ...createOnlineCVDto,
      userId: user._id,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      _id: newCV._id,
      templateType: newCV.templateType,
      fullName: newCV.fullName,
      createdAt: newCV.createdAt,
    };
  }

  // Get all online CVs of current user
  async findByUser(user: IUser) {
    const cvs = await this.onlineCVModel
      .find({ userId: user._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .select('-createdBy -updatedBy -deletedBy');
    Logger.log(`Found ${cvs.length} online CV(s) for user ${user.email}`);
    return cvs;
  }

  // Get one online CV by ID
  async findOne(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.onlineCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new NotFoundException('CV không tồn tại hoặc không thuộc về bạn');
    }

    return cv;
  }

  // Update online CV
  async update(id: string, updateOnlineCVDto: UpdateOnlineCVDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.onlineCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new NotFoundException('CV không tồn tại hoặc không thuộc về bạn');
    }

    await this.onlineCVModel.updateOne(
      { _id: id },
      {
        ...updateOnlineCVDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return await this.findOne(id, user);
  }

  // Delete online CV
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('CV không tồn tại');
    }

    const cv = await this.onlineCVModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!cv) {
      throw new NotFoundException('CV không tồn tại hoặc không thuộc về bạn');
    }

    // Prevent deletion of exported online CVs (UserCVs reference them via onlineCvId)
    if (cv.pdfUrl) {
      throw new BadRequestException('Không thể xóa CV đã được xuất PDF. Vui lòng xóa bản PDF trước.');
    }

    await this.onlineCVModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return await this.onlineCVModel.softDelete({ _id: id });
  }

  // Resolve templates directory (dist or src fallback)
  private getTemplatesDir(): string {
    const compiledDir = join(__dirname, 'templates');
    const srcDir = join(process.cwd(), 'src', 'online-cvs', 'templates');
    return existsSync(compiledDir) ? compiledDir : srcDir;
  }

  // Generate HTML from Handlebars template based on templateType
  private generateHTML(cv: OnlineCVDocument): string {
    const templateFile = `${cv.templateType}.hbs`;
    const templatePath = join(this.getTemplatesDir(), templateFile);

    if (!existsSync(templatePath)) {
      throw new BadRequestException(`Template '${cv.templateType}' không tồn tại`);
    }

    const templateSource = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);

    return template(cv.toObject());
  }

  // Export CV to PDF and save to user's CV list
  async exportToPdf(id: string, user: IUser) {
    const cv = await this.findOne(id, user);

    if (!puppeteer) {
      throw new BadRequestException('PDF generation is not available');
    }

    try {
      // Generate HTML based on template type
      const html = this.generateHTML(cv);

      // Launch browser and create PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      
      await browser.close();

      // Upload PDF to Cloudinary
      const uploadResult = await this.filesService.uploadBuffer(
        pdfBuffer,
        `cv_${cv._id}_${Date.now()}.pdf`,
        'application/pdf'
      );

      // Update online CV with PDF URL
      await this.onlineCVModel.updateOne(
        { _id: id },
        { pdfUrl: uploadResult.url },
      );

      // Build parsedText and structured data from online CV
      const parsedTextParts = [
        cv.fullName ? `Họ tên: ${cv.fullName}` : '',
        cv.position ? `Vị trí: ${cv.position}` : '',
        cv.phone ? `Điện thoại: ${cv.phone}` : '',
        cv.email ? `Email: ${cv.email}` : '',
        cv.address ? `Địa chỉ: ${cv.address}` : '',
        cv.careerObjective ? `Mục tiêu nghề nghiệp: ${cv.careerObjective}` : '',
        cv.skills?.length ? `Kỹ năng: ${cv.skills.map((s: any) => s.name + (s.description ? ` (${s.description})` : '')).join(', ')}` : '',
        cv.education?.length ? `Học vấn: ${cv.education.map((e: any) => `${e.schoolName} - ${e.major} (${e.startDate || ''} - ${e.endDate || ''})`).join('. ')}` : '',
        cv.workExperience?.length ? `Kinh nghiệm: ${cv.workExperience.map((w: any) => `${w.companyName} - ${w.position} (${w.startDate || ''} - ${w.endDate || ''}): ${w.description || ''}`).join('. ')}` : '',
        cv.certificates?.length ? `Chứng chỉ: ${cv.certificates.map((c: any) => c.name).join(', ')}` : '',
        cv.activities?.length ? `Hoạt động: ${cv.activities.map((a: any) => `${a.organizationName} - ${a.position}`).join(', ')}` : '',
        cv.awards?.length ? `Giải thưởng: ${cv.awards.map((a: any) => a.name).join(', ')}` : '',
      ];
      const parsedText = parsedTextParts.filter(Boolean).join('\n');

      const skillsArr = (cv.skills || []).map((s: any) => s.name).filter(Boolean);
      const educationArr = (cv.education || []).map((e: any) => `${e.schoolName || ''} - ${e.major || ''}`).filter((s: string) => s.trim() !== '-');
      const experienceArr = (cv.workExperience || []).map((w: any) => `${w.companyName || ''} - ${w.position || ''}: ${w.description || ''}`).filter(Boolean);
      const certificatesArr = (cv.certificates || []).map((c: any) => c.name).filter(Boolean);

      // Check if a UserCV already exists for this online CV (re-export case)
      const existingUserCV = await this.userCVsService.findByOnlineCvId(id, user);

      if (existingUserCV) {
        // Update existing UserCV with new PDF URL and parsed data
        await this.userCVsService.update(
          existingUserCV._id.toString(),
          {
            url: uploadResult.url,
            title: `${cv.fullName} - ${cv.templateType === 'template1' ? 'Mẫu cơ bản' : 'Mẫu hiện đại'}`,
            parsedText,
            skills: skillsArr,
            education: educationArr,
            experience: experienceArr,
            certificates: certificatesArr,
          },
          user,
        );
      } else {
        // Create a new user CV entry with reference to online CV
        await this.userCVsService.create(
          {
            url: uploadResult.url,
            title: `${cv.fullName} - ${cv.templateType === 'template1' ? 'Mẫu cơ bản' : 'Mẫu hiện đại'}`,
            onlineCvId: id,
            parsedText,
            skills: skillsArr,
            education: educationArr,
            experience: experienceArr,
            certificates: certificatesArr,
          },
          user,
        );
      }

      return {
        _id: cv._id,
        pdfUrl: uploadResult.url,
        message: 'Xuất PDF thành công và đã lưu vào danh sách CV',
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new BadRequestException('Không thể tạo PDF: ' + error.message);
    }
  }

  // Get preview HTML (for client-side preview)
  async getPreviewHTML(id: string, user: IUser) {
    const cv = await this.findOne(id, user);
    
    const html = this.generateHTML(cv);

    return { html };
  }
}
