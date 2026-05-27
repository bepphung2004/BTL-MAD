import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { IJob } from '../../types';

/**
 * Định nghĩa các Props truyền vào cho Component JobCard
 */
interface JobCardProps {
  job: IJob;            // Đối tượng dữ liệu công việc (chứa thông tin tiêu đề, công ty, lương,...)
  onPress: () => void;  // Hàm callback kích hoạt khi người dùng nhấn vào thẻ để xem chi tiết
  onSave?: () => void;  // Hàm callback kích hoạt khi người dùng nhấn lưu/bỏ lưu công việc (Tùy chọn)
  isSaved?: boolean;    // Trạng thái công việc đã được lưu bởi người dùng hiện tại hay chưa (Mặc định: false)
}

/**
 * Component hiển thị thẻ thông tin rút gọn của một công việc (Job Card) dùng trong danh sách tuyển dụng
 */
export const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  onSave,
  isSaved = false,
}) => {
  
  /**
   * Hàm nội bộ: Rút gọn hiển thị tiền lương (Ví dụ: 15000000 -> 15M, 5000 -> 5K)
   */
  const formatSalary = (salary: string | number) => {
    const num = Number(salary);
    // Nếu lương truyền vào không phải là số hợp lệ (ví dụ chuỗi chữ), giữ nguyên chuỗi
    if (isNaN(num)) return salary.toString();
    
    // Rút gọn theo hàng triệu (M)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(0)}M`;
    }
    // Rút gọn theo hàng nghìn (K)
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  return (
    // Toàn bộ thẻ bọc trong TouchableOpacity để bắt sự kiện nhấn (onPress) và tạo hiệu ứng mờ nhẹ
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      
      {/* KHU VỰC HEADER: Logo công ty, tiêu đề việc làm và nút lưu (Bookmark) */}
      <View style={styles.header}>
        {/* Ảnh Logo công ty - Nếu không có ảnh sẽ dùng ảnh fallback placeholder */}
        <Image
          source={{ uri: job.company?.logo || 'https://via.placeholder.com/50' }}
          style={styles.logo}
        />
        
        {/* Khối thông tin văn bản tiêu đề */}
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {job.name}
          </Text>
          <Text style={styles.company} numberOfLines={1}>
            {job.company?.name || 'Công ty'}
          </Text>
        </View>
        
        {/* Nút Lưu bài đăng: Chỉ hiển thị nếu hàm xử lý onSave được truyền vào */}
        {onSave && (
          <TouchableOpacity onPress={onSave} style={styles.saveButton}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'} // Thay đổi icon dựa trên trạng thái lưu
              size={24}
              color={isSaved ? COLORS.primary : COLORS.gray[400]}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* KHU VỰC THÔNG TIN PHỤ (TAGS): Địa điểm, Mức lương và Cấp bậc */}
      <View style={styles.tags}>
        {/* Địa điểm làm việc */}
        <View style={styles.tag}>
          <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.tagText}>{job.location}</Text>
        </View>
        
        {/* Mức lương được format rút gọn */}
        <View style={styles.tag}>
          <Ionicons name="cash-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.tagText}>{formatSalary(job.salary)} VND</Text>
        </View>
        
        {/* Cấp bậc công việc (Intern, Junior, Senior,...) */}
        <View style={styles.tag}>
          <Ionicons name="briefcase-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.tagText}>{job.level}</Text>
        </View>
      </View>

      {/* KHU VỰC FOOTER: Danh sách kỹ năng (Skills) và trạng thái hiển thị tuyển dụng */}
      <View style={styles.footer}>
        <View style={styles.skills}>
          {/* Chỉ cắt lấy tối đa 3 kỹ năng đầu tiên để hiển thị trên giao diện thẻ rút gọn */}
          {job.skills?.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>
                {/* Hỗ trợ dữ liệu kỹ năng ở cả dạng chuỗi thuần hoặc dạng object chứa thuộc tính name */}
                {typeof skill === 'string' ? skill : skill.name}
              </Text>
            </View>
          ))}
          
          {/* Nếu tổng số kỹ năng nhiều hơn 3, hiển thị số lượng kỹ năng còn ẩn phía sau (Ví dụ: +2) */}
          {job.skills && job.skills.length > 3 && (
            <Text style={styles.moreSkills}>+{job.skills.length - 3}</Text>
          )}
        </View>
        
        {/* Tag trạng thái "Đang tuyển" nếu cờ isActive mang giá trị true */}
        {job.isActive && (
          <View style={styles.activeTag}>
            <Text style={styles.activeText}>Đang tuyển</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * Định nghĩa hệ thống Stylesheet cho các thành phần giao diện của JobCard
 */
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 12,
    // Cấu hình đổ bóng (Shadow) hoạt động trên nền tảng iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Cấu hình đổ bóng hoạt động trên nền tảng Android
    elevation: 3,
  },
  header: {
    flexDirection: 'row', // Sắp xếp logo, tiêu đề, nút bookmark nằm ngang hàng
    alignItems: 'flex-start',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  headerInfo: {
    flex: 1, // Chiếm trọn không gian trống còn lại ở giữa header
    marginLeft: 12,
  },
  title: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  company: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
  },
  saveButton: {
    padding: 4, // Tăng diện tích vùng bấm cho nút lưu bài viết
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Tự động xuống dòng nếu danh sách các tag dài vượt quá chiều rộng màn hình
    marginTop: 12,
    gap: 8, // Khoảng cách giữa các ô tag phụ
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  tagText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Đẩy khối kỹ năng sang trái và trạng thái "Đang tuyển" sang phải
    marginTop: 12,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  skillTag: {
    // Trộn màu chủ đạo (COLORS.primary) với mã Hex độ mờ 20% tạo nền nhạt sang trọng
    backgroundColor: COLORS.primary + '20', 
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  skillText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginLeft: 4,
  },
  activeTag: {
    backgroundColor: COLORS.success + '20', // Màu nền xanh thành công độ mờ 20%
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
});