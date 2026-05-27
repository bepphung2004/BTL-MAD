import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../../constants";
import { Button, Input } from "../../components/common";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearError, registerByHr } from "../../store/slices/authSlice";
import { RootStackParamList } from "../../navigation/AppNavigator";

/**
 * Định nghĩa kiểu dữ liệu cho Props của màn hình RegisterHrScreen
 */
type RegisterScreenProps = {
  // Đối tượng navigation hỗ trợ chuyển tuyến trong Stack Navigator nhóm Register
  navigation: NativeStackNavigationProp<RootStackParamList, "Register">;
};

/**
 * Màn hình Đăng ký Nhà tuyển dụng (RegisterHrScreen) xử lý thu thập thông tin cá nhân 
 * kết hợp thông tin doanh nghiệp, gửi yêu cầu tạo tài khoản HR chờ phê duyệt lên hệ thống.
 */
const RegisterHrScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  // --- REDUX HOOKS ---
  const dispatch = useAppDispatch();
  // API gọi ngoài (Redux): Lấy trạng thái loading đăng ký từ Redux Store để hiển thị hiệu ứng trên nút bấm
  const { isRegisterLoading } = useAppSelector((state) => state.auth);

  // --- LOCAL STATES ---
  // State quản lý tập trung toàn bộ dữ liệu các ô nhập trong Form (Form Object Pattern)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
    address: "",
    companyName: "",
    taxCode: "",
    companyScale: "",
  });
  // State lưu trữ danh sách các thông báo lỗi kiểm tra điều kiện của từng ô nhập
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- LOGIC FUNCTIONS ---

  /**
   * Hàm nội bộ: Kiểm tra điều kiện bắt buộc điền và tính hợp lệ cấu trúc của các trường thông tin cốt lõi
   */
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = "Họ tên không được để trống";
    }

    if (!formData.email) {
      newErrors.email = "Email không được để trống";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }

    setErrors(newErrors);
    // Trả về true nếu không có bất kỳ lỗi nào được ghi nhận vào object newErrors
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Gửi dữ liệu đăng ký tài khoản HR lên máy chủ sau khi xử lý chuẩn hóa dữ liệu đầu vào
   */
  const handleRegister = async () => {
    // Nếu dữ liệu form không vượt qua bài test validate thì dừng tiến trình
    if (!validate()) return;
    
    // API gọi ngoài (Redux): Xóa các thông báo lỗi cũ đang tồn tại trong Redux auth slice
    dispatch(clearError());
    
    // API gọi ngoài (Redux Thunk): Kích hoạt gửi action đăng ký tài khoản HR bất đồng bộ
    const result = await dispatch(
      registerByHr({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        // Ép kiểu chuỗi tuổi (String) sang kiểu Số nguyên (Number) nền cơ số 10 trước khi gửi lên API DB
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        // Chuẩn hóa: Nếu chuỗi rỗng sẽ chuyển về giá trị undefined để tránh gửi chuỗi trống lên API
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        companyName: formData.companyName || undefined,
        taxCode: formData.taxCode || undefined,
        companyScale: formData.companyScale || undefined,
      }),
    );

    // Xử lý kết quả trả về sau khi Thunk Action thực thi xong
    if (registerByHr.fulfilled.match(result)) {
      // Đăng ký thành công -> Hiển thị thông báo yêu cầu chờ phê duyệt và đưa người dùng về trang Đăng nhập
      Alert.alert(
        "Đăng ký thành công",
        "Tài khoản của bạn đang chờ Admin duyệt. Bạn sẽ nhận được thông báo khi tài khoản được kích hoạt.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }],
      );
    } else if (registerByHr.rejected.match(result)) {
      // Đăng ký thất bại -> Hiển thị hộp thoại thông báo lỗi trả về từ API Backend
      Alert.alert("Lỗi", (result.payload as string) || "Đăng ký thất bại");
    }
  };

  /**
   * Hàm nội bộ: Cập nhật động giá trị cho từng thuộc tính trong formData object 
   * đồng thời tự động xóa thông báo lỗi của ô nhập đó ngay khi người dùng gõ ký tự mới
   */
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // --- GIAO DIỆN COMPONENT ---
  return (
    <SafeAreaView style={styles.container}>
      {/* KeyboardAvoidingView: Tự động tính toán đẩy giao diện biểu mẫu lên trên khi bàn phím ảo chiếm chỗ */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} // Ẩn thanh cuộn dọc vật lý nhằm tối ưu thẩm mỹ
        >
          {/* Nút quay lại màn hình trước đó trong lịch sử điều hướng */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>

          {/* KHU VỰC HEADER: Tên biểu mẫu và mô tả vắn tắt */}
          <View style={styles.header}>
            <Text style={styles.title}>Đăng ký HR</Text>
            <Text style={styles.subtitle}>
              Tạo tài khoản nhà tuyển dụng
            </Text>
          </View>

          {/* Khối Banner thông báo quy trình phê duyệt đặc thù của tài khoản vai trò HR */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoBannerText}>
              Sau khi đăng ký, tài khoản sẽ cần được Admin duyệt trước khi sử dụng.
            </Text>
          </View>

          {/* KHU VỰC BIỂU MẪU (FORM inputs) */}
          <View style={styles.form}>
            
            {/* PHÂN ĐOẠN 1: Thu thập thông tin cá nhân */}
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            </View>

            <Input
              label="Họ và tên *"
              placeholder="Nhập họ và tên"
              value={formData.name}
              onChangeText={(value) => updateField("name", value)}
              error={errors.name}
              leftIcon={
                <Ionicons name="person-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Email *"
              placeholder="Nhập email của bạn"
              value={formData.email}
              onChangeText={(value) => updateField("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={
                <Ionicons name="mail-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Mật khẩu *"
              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
              value={formData.password}
              onChangeText={(value) => updateField("password", value)}
              secureTextEntry // Ẩn ký tự nhập bảo mật mật khẩu
              error={errors.password}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Xác nhận mật khẩu *"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField("confirmPassword", value)}
              secureTextEntry
              error={errors.confirmPassword}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Tuổi"
              placeholder="Nhập tuổi (tùy chọn)"
              value={formData.age}
              onChangeText={(value) => updateField("age", value)}
              keyboardType="numeric" // Hiển thị bàn phím số chuyên dụng
              leftIcon={
                <Ionicons name="calendar-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Giới tính"
              placeholder="Nam / Nữ / Khác (tùy chọn)"
              value={formData.gender}
              onChangeText={(value) => updateField("gender", value)}
              leftIcon={
                <Ionicons name="male-female-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Địa chỉ"
              placeholder="Nhập địa chỉ (tùy chọn)"
              value={formData.address}
              onChangeText={(value) => updateField("address", value)}
              leftIcon={
                <Ionicons name="location-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            {/* PHÂN ĐOẠN 2: Thu thập thông tin doanh nghiệp liên quan sơ bộ phục vụ đối chiếu */}
            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
              <Ionicons name="business-outline" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Thông tin công ty (tùy chọn)</Text>
            </View>

            <Text style={styles.sectionHint}>
              Thông tin này giúp Admin xác minh tài khoản nhanh hơn. Bạn sẽ tạo hoặc tham gia công ty sau khi được duyệt.
            </Text>

            <Input
              label="Tên công ty"
              placeholder="Nhập tên công ty (tùy chọn)"
              value={formData.companyName}
              onChangeText={(value) => updateField("companyName", value)}
              leftIcon={
                <Ionicons name="business-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Mã số thuế"
              placeholder="Nhập mã số thuế (tùy chọn)"
              value={formData.taxCode}
              onChangeText={(value) => updateField("taxCode", value)}
              leftIcon={
                <Ionicons name="document-text-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            <Input
              label="Quy mô công ty"
              placeholder="VD: 1-10, 10-50, 50-200, 200+ (tùy chọn)"
              value={formData.companyScale}
              onChangeText={(value) => updateField("companyScale", value)}
              leftIcon={
                <Ionicons name="people-outline" size={20} color={COLORS.gray[400]} />
              }
            />

            {/* Nút thực thi Đăng ký tài khoản */}
            <Button
              title="Đăng ký"
              onPress={handleRegister}
              loading={isRegisterLoading} // Nhận trạng thái loading từ Redux Store để vô hiệu hóa nút bấm và hiển thị spinner quay khi đang xử lý
              style={styles.registerButton}
            />
          </View>

          {/* KHU VỰC FOOTER: Chuyển hướng người dùng về màn Đăng nhập nếu đã sẵn sàng tài khoản */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Khởi tạo hệ thống Stylesheet định dạng giao diện cho màn hình Đăng ký HR
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1, // Hỗ trợ ScrollView kéo giãn bao trọn vùng không gian hiển thị linh hoạt
    paddingHorizontal: SIZES.padding,
    paddingVertical: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: COLORS.info + "10", // Trộn màu mã thông tin với 10% độ đục làm nền dịu mắt
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 20,
  },
  form: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray[800],
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginBottom: 12,
    lineHeight: 19,
  },
  registerButton: {
    marginTop: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    color: COLORS.gray[500],
    fontSize: SIZES.md,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: "600",
  },
});

export default RegisterHrScreen;