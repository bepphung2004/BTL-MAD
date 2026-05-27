import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { Subscriber, SubscriberDocument } from 'src/subscribers/schemas/subscriber.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Service điều khiển logic gửi email hệ thống (gửi OTP, khôi phục mật khẩu, mời phỏng vấn)
 * và tự động quét gửi thông báo việc làm phù hợp cho ứng viên qua Cron Job.
 */
@Injectable()
export class MailService {
  // Khởi tạo Logger riêng cho MailService để ghi nhận lịch trình và lỗi hệ thống
  private readonly logger = new Logger(MailService.name);
  
  // Kích thước mỗi cụm (Batch) xử lý người dùng, tránh quá tải RAM và máy chủ Mail khi gửi hàng loạt
  private readonly BATCH_SIZE = 20;

  constructor(
    // Inject MailerService từ thư viện @nestjs-modules/mailer để thực hiện lệnh gửi mail thực tế
    private readonly mailerService: MailerService,
    
    // Inject các Model Mongoose để tương tác với cơ sở dữ liệu Người đăng ký & Công việc
    @InjectModel(Subscriber.name)
    private readonly subscriberModel: SoftDeleteModel<SubscriberDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: SoftDeleteModel<JobDocument>,
  ) {}

  /**
   * Gửi email chứa mã OTP để xác thực tài khoản
   */
  async sendOtp(email: string, otp: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Xác thực OTP',
      template: 'otp', // Sử dụng file giao diện 'otp.hbs'
      context: {
        otp, // Truyền biến otp vào giao diện
      },
    });
  }

  /**
   * Gửi email đính kèm liên kết chứa token để đặt lại mật khẩu cho người dùng quên mật khẩu
   */
  async sendForgotPassword(email: string, token: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu',
      template: 'forgot-password', // Sử dụng file giao diện 'forgot-password.hbs'
      context: {
        link: `${process.env.URL_FRONTEND}/reset-password?token=${token}`, // URL dẫn tới trang reset mật khẩu ở FE
      },
    });
  }

  /**
   * Gửi thư mời phỏng vấn trực tiếp bằng nội dung HTML (Do HR biên soạn tự do từ Client)
   */
  async sendInterviewInvite(email: string, subject: string, content: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: subject || 'Thư mời phỏng vấn',
      html: content, // Nhận trực tiếp chuỗi HTML tĩnh thay vì dùng file template mẫu
    });
  }

  /**
   * Gửi thư chào mừng ứng viên mới tham gia vào hệ thống
   */
  async sendWelcome(email: string, name: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Chào mừng bạn đến với hệ thống',
      template: 'welcome', // Sử dụng file giao diện 'welcome.hbs'
      context: {
        name,
      },
    });
  }

  /**
   * Cron Job tự động hóa chạy lúc 8:00 AM mỗi ngày
   * Quét toàn bộ ứng viên đăng ký nhận tin và gửi danh sách các công việc phù hợp với kỹ năng của họ
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendJobNotificationCron() {
    this.logger.log('Starting job notification cron job...');

    try {
      // 1. Đếm tổng số lượng người đăng ký còn đang hoạt động và không bị xóa mềm
      const totalSubscribers = await this.subscriberModel.countDocuments({
        isActive: true,
        isDeleted: false,
      });

      if (totalSubscribers === 0) {
        this.logger.log('No active subscribers found');
        return;
      }

      // 2. Tính toán tổng số cụm (Batch/Page) cần lặp qua dựa vào kích thước BATCH_SIZE
      const totalPages = Math.ceil(totalSubscribers / this.BATCH_SIZE);
      this.logger.log(`Found ${totalSubscribers} subscribers, processing in ${totalPages} batches`);

      let emailsSent = 0;

      // 3. Vòng lặp xử lý phân trang dữ liệu (Tránh load tất cả bản ghi cùng lúc gây sập bộ nhớ RAM)
      for (let page = 1; page <= totalPages; page++) {
        this.logger.log(`Processing batch ${page}/${totalPages}`);

        // Lấy danh sách Subscriber của trang hiện tại, nạp thêm dữ liệu thông tin chi tiết kỹ năng (skills)
        const subscribers = await this.subscriberModel
          .find({
            isActive: true,
            isDeleted: false,
          })
          .populate({
            path: 'skills',
            select: { _id: 1, name: 1 },
          })
          .skip((page - 1) * this.BATCH_SIZE)
          .limit(this.BATCH_SIZE);

        // Duyệt từng Subscriber trong trang hiện tại để kiểm tra việc làm và gửi mail
        for (const subscriber of subscribers) {
          try {
            // Hàm nội bộ tìm công việc tương thích và gửi email
            await this.sendJobNotificationToSubscriber(subscriber);
            emailsSent++;

            // Lưu vết mốc thời gian gửi email mới nhất để tránh gửi trùng lặp hoặc phục vụ thống kê
            await this.subscriberModel.updateOne(
              { _id: subscriber._id },
              { lastEmailSentAt: new Date() },
            );
          } catch (error) {
            this.logger.error(`Failed to send email to ${subscriber.email}: ${error.message}`);
          }
        }

        // Tạo khoảng trễ ngắn (1 giây) giữa các batch nhằm tránh bị các nhà cung cấp Mail (như Gmail, Mailgun) đánh dấu là Spam/Spamming
        if (page < totalPages) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      this.logger.log(`Job notification cron completed. Sent ${emailsSent} emails`);
    } catch (error) {
      this.logger.error(`Job notification cron failed: ${error.message}`);
    }
  }

  /**
   * Hàm nội bộ (Private): Tìm kiếm việc làm phù hợp và gửi mail cho DUY NHẤT một ứng viên cụ thể
   */
  private async sendJobNotificationToSubscriber(subscriber: SubscriberDocument) {
    // Chuyển mảng đối tượng kỹ năng thành mảng danh sách tên chuỗi thuần tuý (string[])
    const skillNames = subscriber.skills.map((skill: any) => skill.name);

    if (skillNames.length === 0) {
      this.logger.debug(`Subscriber ${subscriber.email} has no skills, skipping`);
      return;
    }

    this.logger.debug(`Finding jobs for subscriber ${subscriber.email} with skills: ${skillNames.join(', ')}`);
    
    const now = new Date();
    
    // Tìm kiếm tối đa 10 công việc đang hoạt động, còn hạn nộp hồ sơ (endDate > hiện tại)
    // Lưu ý từ mã nguồn: Hiện tại điều kiện kỹ năng đang bị gắn cứng (Hardcode) kiểm tra "FULLSTACK"
    const jobs = await this.jobModel
      .find({
        skills: { $in: ["FULLSTACK"] }, // Tìm job có chứa tag kỹ năng (Có thể đổi thành $in: skillNames ở môi trường production)
        isActive: true,
        isDeleted: false,
        endDate: { $gt: now },
      })
      .populate({
        path: 'company',
        select: { _id: 1, name: 1, logo: 1 }, // Lấy thêm thông tin rút gọn của công ty tuyển dụng
      })
      .limit(10)
      .lean()  // Chuyển đổi kết quả sang JSON thuần tuý giúp tăng hiệu năng truy vấn, giảm tải cho Mongoose Document
      .exec();
      
    this.logger.debug(`Found ${jobs.length} jobs for subscriber ${subscriber.email}, ${skillNames}`);
    
    // Nếu phát hiện có công việc phù hợp -> Tiến hành kích hoạt gửi mail thông báo tin tuyển dụng
    if (jobs.length > 0) {
      this.logger.debug(`Sending ${jobs.length} jobs to ${subscriber.email}`);

      await this.mailerService.sendMail({
        to: subscriber.email,
        subject: `${jobs.length} việc làm mới phù hợp với kỹ năng của bạn`,
        template: 'job-notification', // Giao diện mẫu 'job-notification.hbs'
        context: {
          jobs, // Mảng danh sách công việc phù hợp
          subscriberEmail: subscriber.email,
          skillNames: skillNames.join(', '),
        },
      });
    }
  }

  /**
   * API/Phương thức dự phòng (Legacy): Sử dụng để kích hoạt thủ công tiến trình gửi thư việc làm cho toàn bộ ứng viên
   * Xử lý tìm kiếm động bằng Regex so khớp chuỗi không phân biệt hoa thường dựa trên đúng kỹ năng của ứng viên.
   */
  async sendJobNotification() {
    // Lấy danh sách tất cả ứng viên đang kích hoạt nhận tin
    const subscribers = await this.subscriberModel.find({
      isActive: true,
      isDeleted: false,
    }).populate({
      path: 'skills',
      select: { _id: 1, name: 1 },
    });

    for (const subscriber of subscribers) {
      const skillNames = subscriber.skills.map((skill: any) => skill.name);
      
      // Khởi tạo danh sách biểu thức chính quy (Regex) không phân biệt chữ hoa, chữ thường để tìm kiếm khớp chuỗi text
      const skillRegexes = skillNames.map((name: string) => new RegExp(name, 'i'));

      // Tìm job dựa vào mảng tên kỹ năng dạng chuỗi thông qua Regex toán tử $in
      const jobs = await this.jobModel.find({
        skills: { $in: skillRegexes },
        isActive: true,
        isDeleted: false,
      }).populate({
        path: 'company',
        select: { _id: 1, name: 1, logo: 1 },
      }).limit(10);

      // Nếu có job tương thích thì gửi mail ngay lập tức
      if (jobs.length > 0) {
        await this.mailerService.sendMail({
          to: subscriber.email,
          subject: `${jobs.length} việc làm mới phù hợp với kỹ năng của bạn`,
          template: 'job-notification',
          context: {
            jobs,
            subscriberEmail: subscriber.email,
            skillNames: skillNames.join(', '),
          },
        });
      }
    }
  }
}