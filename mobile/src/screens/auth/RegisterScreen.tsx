import React, { useState } from 'react';
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { Button, Input } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { register, clearError } from '../../store/slices/authSlice';
import { RootStackParamList } from '../../navigation/AppNavigator';

/**
 * Định nghĩa kiểu dữ liệu cho Props của màn hình RegisterScreen
 */
type RegisterScreenProps = {
  // Đối tượng navigation hỗ trợ điều hướng trong Stack Navigator nhóm Register
  navigation: NativeStackNavigationProp<RootStackParamList, 'RegisterHr'>;
};

/**
 * Màn hình Đăng ký Ứng viên (RegisterScreen) xử lý thu thập thông tin tài khoản cá nhân,
 * thực hiện xác thực và gọi API tạo tài khoản người dùng thông thường (USER) qua Redux Store.
 */
const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  // --- REDUX HOOKS ---
  const dispatch = useAppDispatch();
  // API gọi ngoài (Redux): Lấy trạng thái loading đăng ký từ Redux Store để hiển thị hiệu ứng trên nút bấm
  const { isRegisterLoading } = useAppSelector((state) => state.auth);

  // --- LOCAL STATES ---
  // State quản lý tập trung dữ liệu đầu vào của toàn bộ form đăng ký ứng viên
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    address: '',
  });
  // State lưu trữ các thông báo lỗi tương ứng với từng ô nhập dữ liệu
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- LOGIC FUNCTIONS ---

  /**
   * Hàm nội bộ: Kiểm tra tính hợp lệ về mặt định dạng và bắt buộc điền của các trường thông tin
   */
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = 'Họ tên không được để trống';
    }

    if (!formData.email) {
      newErrors.email = 'Email không được để trống';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    setErrors(newErrors);
    // Trả về true nếu object lưu thông tin lỗi trống (không có lỗi)
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Gửi thông tin đăng ký lên hệ thống sau khi đã kiểm tra validate thành công
   */
  const handleRegister = async () => {
    if (!validate()) return;

    // API gọi ngoài (Redux): Xóa bỏ các lỗi đăng ký cũ trong Redux Store nếu có
    dispatch(clearError());
    
    // API gọi ngoài (Redux Thunk): Dispatch async thunk 'register' gửi dữ liệu ứng viên lên server
    const result = await dispatch(
      register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        // Chuẩn hóa dữ liệu: Ép kiểu chuỗi tuổi (String) sang Số nguyên (Number) nền cơ số 10
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        // Nếu trường tùy chọn để trống, gán giá trị undefined để tránh gửi chuỗi rỗng lên API
        gender: formData.gender || undefined,
        address: formData.address || undefined,
      })
    );

    // Xử lý phản hồi kết quả sau khi Thunk Action chạy xong
    if (register.fulfilled.match(result)) {
      // Đăng ký thành công -> Hiển thị thông báo popup và điều hướng người dùng sang màn hình Đăng nhập (Login)
      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } else if (register.rejected.match(result)) {
      // Đăng ký thất bại -> Hiển thị lỗi chi tiết nhận về từ payload của Backend Server
      Alert.alert('Lỗi', result.payload as string || 'Đăng ký thất bại');
      return;
    }
  };

  /**
   * Hàm nội bộ: Cập nhật động dữ liệu cho từng thuộc tính trong formData 
   * đồng thời tự động xóa thông báo lỗi của thuộc tính đó ngay khi người dùng chỉnh sửa
   */
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // --- GIAO DIỆN COMPONENT ---
  return (
    <SafeAreaView style={styles.container}>
      {/* KeyboardAvoidingView: Tự động nâng giao diện lên khi bàn phím ảo hiển thị để tránh che khuất các ô nhập */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} // Ẩn thanh cuộn dọc mặc định
        >
          {/* Nút quay lại màn hình trước đó */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>

          {/* KHU VỰC HEADER: Tiêu đề và mô tả ngắn của màn hình đăng ký */}
          <View style={styles.header}>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Điền thông tin để đăng ký</Text>
          </View>

          {/* KHU VỰC BIỂU MẪU NHẬP LIỆU (FORM) */}
          <View style={styles.form}>
            <Input
              label="Họ và tên *"
              placeholder="Nhập họ và tên"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              error={errors.name}
              leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Email *"
              placeholder="Nhập email của bạn"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none" // Tắt tự động viết hoa chữ cái đầu
              error={errors.email}
              leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Mật khẩu *"
              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry // Ẩn ký tự nhập để bảo vệ mật khẩu
              error={errors.password}
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Xác nhận mật khẩu *"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry
              error={errors.confirmPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Tuổi"
              placeholder="Nhập tuổi (tùy chọn)"
              value={formData.age}
              onChangeText={(value) => updateField('age', value)}
              keyboardType="numeric" // Mở bàn phím số chuyên dụng
              leftIcon={<Ionicons name="calendar-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Giới tính"
              placeholder="Nam / Nữ / Khác (tùy chọn)"
              value={formData.gender}
              onChangeText={(value) => updateField('gender', value)}
              leftIcon={<Ionicons name="male-female-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Địa chỉ"
              placeholder="Nhập địa chỉ (tùy chọn)"
              value={formData.address}
              onChangeText={(value) => updateField('address', value)}
              leftIcon={<Ionicons name="location-outline" size={20} color={COLORS.gray[400]} />}
            />

            {/* Component Button đăng ký tích hợp vòng xoay loading */}
            <Button
              title="Đăng ký"
              onPress={handleRegister}
              loading={isRegisterLoading} // Hiển thị hiệu ứng chờ dựa theo trạng thái Redux Store
              style={styles.registerButton}
            />
          </View>

          {/* KHU VỰC FOOTER: Chuyển hướng người dùng về màn Đăng nhập nếu đã có tài khoản */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Khởi tạo hệ thống Stylesheet cấu hình giao diện cho màn hình Đăng ký Ứng viên
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
    flexGrow: 1, // Đảm bảo ScrollView mở rộng toàn bộ không gian khả dụng của màn hình
    paddingHorizontal: SIZES.padding,
    paddingVertical: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
  },
  form: {
    marginBottom: 20,
  },
  registerButton: {
    marginTop: 20,
  },
  footer: {
    flexDirection: 'row', // Sắp xếp dòng chữ thông báo và link nhấn nằm ngang hàng
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: COLORS.gray[500],
    fontSize: SIZES.md,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});

export default RegisterScreen;