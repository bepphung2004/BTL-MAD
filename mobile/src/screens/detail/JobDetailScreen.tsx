import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  useWindowDimensions,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../../constants";
import { Button, Loading, CVCard } from "../../components";
import RenderHTML from "react-native-render-html";
import { jobService } from "../../services/jobService";
import { userCVService } from "../../services/userCVService";
import { applicationService } from "../../services/applicationService";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { IJob, IUserCV } from "../../types";

/**
 * Định nghĩa kiểu dữ liệu cho Props của màn hình JobDetailScreen
 */
type JobDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "JobDetail">; // Hỗ trợ điều hướng chuyển trang
  route: RouteProp<RootStackParamList, "JobDetail">;                     // Hỗ trợ trích xuất tham số truyền từ trang trước
};

/**
 * Màn hình Chi tiết Công việc (JobDetailScreen) hiển thị toàn bộ nội dung tuyển dụng, 
 * cho phép người dùng xem danh sách CV cá nhân và tiến hành nộp hồ sơ ứng tuyển (Apply).
 */
const JobDetailScreen: React.FC<JobDetailScreenProps> = ({
  navigation,
  route,
}) => {
  // --- HOOKS & ROUTE PARAMS ---
  // API gọi ngoài (React Native): Lấy kích thước màn hình thiết bị hiện tại để tính toán tỉ lệ hiển thị HTML mô tả
  const { width } = useWindowDimensions();
  // Trích xuất mã ID công việc (jobId) được truyền qua tham số điều hướng từ màn hình danh sách trước đó
  const { jobId } = route.params;

  // --- LOCAL STATES ---
  const [job, setJob] = useState<IJob | null>(null);             // Lưu dữ liệu chi tiết công việc hiện tại
  const [loading, setLoading] = useState(true);                  // Trạng thái loading toàn màn hình khi tải thông tin Job
  const [showApplyModal, setShowApplyModal] = useState(false);   // Điều khiển ẩn/hiện Modal chọn CV ứng tuyển
  const [cvs, setCvs] = useState<IUserCV[]>([]);                 // Danh sách CV của người dùng hiện tại
  const [selectedCV, setSelectedCV] = useState<IUserCV | null>(null); // Bản ghi CV đang được chọn để nộp hồ sơ
  const [loadingCVs, setLoadingCVs] = useState(false);            // Trạng thái loading riêng cho khối danh sách CV trong Modal
  const [applying, setApplying] = useState(false);                // Trạng thái loading trên nút xác nhận khi đang gửi yêu cầu ứng tuyển

  // --- LIFECYCLE HOOKS ---
  // Tự động kích hoạt gọi API tải thông tin công việc ngay khi component được gắn (Mount) và mỗi khi jobId thay đổi
  useEffect(() => {
    loadJob();
  }, [jobId]);

  // --- BUSINESS LOGIC FUNCTIONS ---

  /**
   * API gọi ngoài (jobService): Tải thông tin chi tiết của công việc từ Server dựa vào jobId
   */
  const loadJob = async () => {
    try {
      const response = await jobService.getJobById(jobId);
      setJob(response.data);
    } catch (error) {
      console.error("Failed to load job:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin việc làm");
      navigation.goBack(); // Quay lại màn hình trước nếu xảy ra lỗi tải dữ liệu công việc
    } finally {
      setLoading(false);
    }
  };

  /**
   * API gọi ngoài (userCVService): Tải danh sách hồ sơ CV cá nhân của ứng viên để chuẩn bị ứng tuyển
   */
  const loadCVs = async () => {
    setLoadingCVs(true);
    try {
      const response = await userCVService.getMyCVs();
      const userCvs = response.data || [];
      setCvs(userCvs);
      
      // Logic nghiệp vụ: Tự động tìm kiếm và thiết lập mặc định chọn CV chính (isPrimary) của ứng viên
      const primaryCV = userCvs.find((cv: IUserCV) => cv.isPrimary);
      if (primaryCV) setSelectedCV(primaryCV);
    } catch (error) {
      console.error("Failed to load CVs:", error);
    } finally {
      setLoadingCVs(false);
    }
  };

  /**
   * Hàm nội bộ: Mở giao diện Modal nộp hồ sơ, đồng thời kích hoạt luồng tải dữ liệu danh sách CV
   */
  const handleOpenApplyModal = () => {
    setShowApplyModal(true);
    loadCVs();
  };

  /**
   * API gọi ngoài (applicationService): Gửi yêu cầu ứng tuyển hồ sơ đính kèm CV lên hệ thống Nhà tuyển dụng
   */
  const handleApply = async () => {
    if (!selectedCV) {
      Alert.alert("Thông báo", "Vui lòng chọn CV để ứng tuyển");
      return;
    }

    if (!job) return;

    setApplying(true);
    try {
      // Thực hiện gọi API nộp hồ sơ kèm theo thông tin vết: mã công việc, mã CV và mã công ty quản lý job
      await applicationService.apply({
        jobId: jobId,
        cvId: selectedCV._id,
        companyId:
          typeof job.company === "string" ? job.company : job.company._id,
      });
      
      Alert.alert("Thành công", "Ứng tuyển thành công!", [
        {
          text: "OK",
          onPress: () => {
            setShowApplyModal(false); // Đóng modal chọn CV
            // Điều hướng ứng viên dịch chuyển sang màn hình quản lý Danh sách hồ sơ đã nộp
            navigation.navigate("MyApplications" as any);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể ứng tuyển",
      );
    } finally {
      setApplying(false);
    }
  };

  /**
   * Hàm nội bộ: Định dạng chuỗi lương thô thành chuỗi ngăn cách hàng nghìn chuẩn tiền tệ Việt Nam (vi-VN)
   * Ví dụ: 15000000 -> "15.000.000"
   */
  const formatSalary = (salary: string | number) => {
    if (salary === null || salary === undefined) return "";
    let num: number;
    if (typeof salary === "string") {
      // Loại bỏ toàn bộ ký tự không phải số trước khi chuyển đổi sang kiểu Number
      num = parseInt(salary.replace(/\D/g, ""), 10);
    } else {
      num = Number(salary);
    }
    if (isNaN(num)) return String(salary);
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  // --- CONDITIONAL RENDERS ---
  // Nếu đang trong tiến trình tải dữ liệu lần đầu, render màn hình chờ Loading toàn màn hình
  if (loading) {
    return <Loading fullScreen text="Đang tải..." />;
  }

  // Nếu không tìm thấy công việc, trả về null để hủy render giao diện
  if (!job) {
    return null;
  }

  // Khai báo an toàn kiểm tra kiểu dữ liệu đối tượng Company lồng trong đối tượng Job
  const company = typeof job.company === "object" ? job.company : null;

  // --- MAIN RENDER ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* PHÂN ĐOẠN 1: COMPANY HEADER (Hiển thị Ảnh đại diện công ty, Tên job, Tên công ty liên kết) */}
        <View style={styles.header}>
          <Image
            source={{ uri: company?.logo || "https://via.placeholder.com/80" }}
            style={styles.companyLogo}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.jobTitle}>{job.name}</Text>
            {/* Nhấn vào tên công ty sẽ điều hướng dịch chuyển sang màn hình xem Chi tiết Công ty */}
            <TouchableOpacity
              onPress={() =>
                company &&
                navigation.navigate("CompanyDetail", { companyId: company._id })
              }
            >
              <Text style={styles.companyName}>
                {company?.name || "Công ty"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PHÂN ĐOẠN 2: THÔNG TIN TỔNG QUAN (Địa điểm, Cấp bậc, Mức lương và Số lượng vị trí cần tuyển) */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.infoText}>{job.location}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="briefcase-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.infoText}>{job.level}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.infoText}>
                {formatSalary(job.salary)} VND
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.infoText}>{job.quantity} vị trí</Text>
            </View>
          </View>
        </View>

        {/* PHÂN ĐOẠN 3: KỸ NĂNG YÊU CẦU (Hiển thị danh sách nhãn mác (Tags) kỹ năng công nghệ) */}
        {job.skills && job.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kỹ năng yêu cầu</Text>
            <View style={styles.skills}>
              {job.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>
                    {/* Hỗ trợ linh hoạt dữ liệu kỹ năng ở cả dạng string thuần túy hoặc dạng đối tượng object chứa trường name */}
                    {typeof skill === "string" ? skill : skill.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* PHÂN ĐOẠN 4: MÔ TẢ CÔNG VIỆC (Sử dụng thư viện render mã nguồn HTML động từ Rich Text Editor của nhà tuyển dụng) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả công việc</Text>
          {job.description ? (
            // API gọi ngoài (react-native-render-html): Phân tích cú pháp và hiển thị giao diện từ chuỗi mã HTML tĩnh mã hoá
            <RenderHTML
              contentWidth={width - 2 * SIZES.padding} // Tính toán chiều rộng khả dụng tránh tràn viền text
              source={{ html: job.description }}
              baseStyle={styles.description}
              tagsStyles={{
                p: { marginBottom: 8 },
                h1: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
                h2: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
              }}
            />
          ) : (
            <Text style={styles.description}>Không có mô tả</Text>
          )}
        </View>

        {/* PHÂN ĐOẠN 5: THỜI HẠN NỘP HỒ SƠ */}
        <View style={styles.section}>
          <View style={styles.deadlineRow}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.warning} />
            <Text style={styles.deadlineText}>
              Hạn nộp: {new Date(job.endDate).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* KHU VỰC CỐ ĐỊNH Ở ĐÁY MÀN HÌNH (FOOTER BUTTON): Nút mở giao diện ứng tuyển (Chỉ hiện khi Job còn mở tuyển) */}
      {job.isActive && (
        <View style={styles.footer}>
          <Button title="Ứng tuyển ngay" onPress={handleOpenApplyModal} />
        </View>
      )}

      {/* MODAL ỨNG TUYỂN: Xuất hiện dạng PageSheet vuốt từ đáy lên cho phép duyệt và lựa chọn CV ứng tuyển */}
      <Modal
        visible={showApplyModal}
        animationType="slide"
        presentationStyle="pageSheet" // Kiểu hiển thị trang giấy xếp đè đặc trưng của nền tảng iOS
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Thanh tiêu đề Modal bọc nút đóng */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowApplyModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.gray[700]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chọn CV ứng tuyển</Text>
            <View style={{ width: 28 }} /> {/* Khối trống cân bằng layout đối xứng */}
          </View>

          {/* Nội dung bên trong Modal */}
          <View style={styles.modalContent}>
            {loadingCVs ? (
              <Loading text="Đang tải CV..." />
            ) : cvs.length === 0 ? (
              /* Trường hợp 1: Ứng viên chưa tạo CV nào trên hệ thống */
              <View style={styles.noCVContainer}>
                <Ionicons name="document-text-outline" size={64} color={COLORS.gray[300]} />
                <Text style={styles.noCVText}>Bạn chưa có CV nào</Text>
                <Button
                  title="Tải lên CV"
                  variant="outline"
                  onPress={() => {
                    setShowApplyModal(false); // Đóng modal hiện tại
                    navigation.navigate("MyCVs" as any); // Điều hướng dịch sang trang quản lý tạo và upload CV
                  }}
                />
              </View>
            ) : (
              /* Trường hợp 2: Hiển thị danh sách CV dưới dạng FlatList cuộn mượt tối ưu bộ nhớ */
              <FlatList
                data={cvs}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.cvItem,
                      selectedCV?._id === item._id && styles.cvItemSelected, // Đổi màu viền nếu CV này đang được click chọn
                    ]}
                    onPress={() => setSelectedCV(item)}
                  >
                    {/* Thẻ hiển thị giao diện hồ sơ CV rút gọn */}
                    <CVCard
                      cv={item}
                      onPress={() => setSelectedCV(item)}
                      showActions={false} // Ẩn các nút Sửa/Xóa CV khi hiển thị trong ngữ cảnh nộp hồ sơ
                    />
                    {/* Hiển thị dấu tích màu xanh góc phải nếu thẻ CV này trùng khớp mã ID đang chọn */}
                    {selectedCV?._id === item._id && (
                      <View style={styles.checkMark}>
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>

          {/* Đáy Modal: Nút gửi lệnh nộp hồ sơ chính thức lên server, chỉ hiện khi ứng viên có sẵn dữ liệu CV */}
          {cvs.length > 0 && (
            <View style={styles.modalFooter}>
              <Button
                title="Xác nhận ứng tuyển"
                onPress={handleApply}
                loading={applying} // Kích hoạt hiệu ứng quay vòng tròn khi tiến trình API đang chạy ngầm
                disabled={!selectedCV} // Vô hiệu hóa tính năng click bấm nếu chưa chọn một CV cụ thể
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

/**
 * Khởi tạo hệ thống Stylesheet định dạng giao diện cho màn hình xem Chi tiết Việc làm
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
  },
  companyLogo: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  companyName: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: "500",
  },
  infoSection: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
  },
  section: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: "600",
    color: COLORS.gray[800],
    marginBottom: 12,
  },
  skills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    backgroundColor: COLORS.primary + "15", // Màu nền thương hiệu nhạt (độ đục 15%)
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.gray[700],
    lineHeight: 24,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deadlineText: {
    fontSize: SIZES.md,
    color: COLORS.warning,
    fontWeight: "500",
  },
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: "600",
    color: COLORS.gray[800],
  },
  modalContent: {
    flex: 1,
    padding: SIZES.padding,
  },
  noCVContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  noCVText: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
  },
  cvItem: {
    position: "relative",
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 4,
  },
  cvItemSelected: {
    borderColor: COLORS.success, // Bật khung viền màu xanh lá khi được click chọn làm hồ sơ nộp
  },
  checkMark: {
    position: "absolute",
    top: 8,
    right: 8, // Định vị huy hiệu dấu tích nằm đè lên góc phải trên cùng của CVCard
  },
  modalFooter: {
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
});

export default JobDetailScreen;