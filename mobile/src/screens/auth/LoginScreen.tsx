import React, { useState } from 'react';
import {
  View,           // Container component (giống <div> trong HTML)
  Text,           // Hiển thị text
  StyleSheet,     // Tạo styles cho component
  SafeAreaView,   // Tránh bị che bởi notch/status bar trên iPhone
  TouchableOpacity, // Button có hiệu ứng nhấn
  KeyboardAvoidingView, // Đẩy UI lên khi bàn phím xuất hiện
  Platform,       // Phân biệt iOS/Android
  ScrollView,     // Cho phép cuộn nội dung
  Alert,          // Hiển thị popup thông báo
} from 'react-native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { Button, Input } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, clearError } from '../../store/slices/authSlice';
import { RootStackParamList } from '../../navigation/AppNavigator';

/**
 * Định nghĩa kiểu dữ liệu cho Props nhận vào của LoginScreen
 */
type LoginScreenProps = {
  // Đối tượng navigation hỗ trợ chuyển hướng linh hoạt trong Stack Navigator nhóm Login
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

/**
 * Màn hình Đăng nhập (LoginScreen) xử lý xác thực tài khoản ứng viên/nhà tuyển dụng,
 * kết nối đồng bộ trạng thái lưu trữ qua Redux Store toàn cục.
 */
const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  // --- REDUX HOOKS ---
  // API gọi ngoài (Redux): Khởi tạo dispatch để gửi các action cập nhật trạng thái vào Store
  const dispatch = useAppDispatch();
  // API gọi ngoài (Redux): Trích xuất các state `isLoading` và `error` từ auth slice trong Redux Store
  const { isLoading, error } = useAppSelector((state) => state.auth);

  // --- LOCAL STATES ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // State quản lý lỗi validation hiển thị trực tiếp dưới form input tại local
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // --- LOGIC FUNCTIONS ---

  /**
   * Hàm nội bộ: Kiểm tra tính hợp lệ về mặt cú pháp của dữ liệu Form trước khi gửi lên Server
   */
  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    // Kiểm tra trường Email trống và đúng định dạng chuỗi regex chuẩn
    if (!email) {
      newErrors.email = 'Email không được để trống';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Kiểm tra trường Mật khẩu trống hoặc ngắn hơn độ dài quy định
    if (!password) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    // Trả về true nếu object lưu lỗi trống (không phát hiện lỗi form)
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Gửi thông tin đăng nhập lên hệ thống thông qua thunk action của Redux
   */
  const handleLogin = async () => {
    // Nếu kiểm tra validate form tại client thất bại thì dừng xử lý
    if (!validate()) return; 

    // API gọi ngoài (Redux): Xóa bỏ các thông báo lỗi đăng nhập cũ còn lưu lại trong Redux Store
    dispatch(clearError());

    // API gọi ngoài (Redux Thunk): Thực hiện dispatch async thunk `login` với tham số đầu vào
    const result = await dispatch(login({ username: email, password }));

    // Kiểm tra nếu thunk action trả về trạng thái lỗi (rejected)
    if (login.rejected.match(result)) {
      // Hiển thị hộp thoại Alert thông báo lỗi chi tiết nhận từ payload của server
      Alert.alert('Lỗi', result.payload as string || 'Đăng nhập thất bại');
    }
    // LƯU Ý HỆ THỐNG: Nếu đăng nhập thành công (fulfilled):
    // - authSlice tự động set trạng thái isAuthenticated = true trong Store toàn cục
    // - AppNavigator lắng nghe thấy sự thay đổi state này → tự động chuyển luồng sang MainTabs
  };

  // --- GIAO DIỆN COMPONENT ---
  return (
    <SafeAreaView style={styles.container}>
      {/* KeyboardAvoidingView: Ngăn chặn bàn phím ảo che khuất các input nhập liệu */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} // Ẩn thanh cuộn dọc mặc định
        >
          
          {/* KHU VỰC HEADER: Logo thương hiệu ứng dụng và văn bản chào mừng */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="briefcase" size={60} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Chào mừng trở lại</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
          </View>

          {/* KHU VỰC FORM: Tập hợp các ô dữ liệu nhập email, mật khẩu, quên mật khẩu và nút submit */}
          <View style={styles.form}>
            {/* Component Input tùy biến cho trường nhập Email */}
            <Input
              label="Email"
              placeholder="Nhập email của bạn"
              value={email}
              onChangeText={setEmail}  
              keyboardType="email-address"  
              autoCapitalize="none" // Tắt tự động viết hoa chữ cái đầu tiên
              error={errors.email}  
              leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gray[400]} />}
            />

            {/* Component Input tùy biến cho trường nhập Mật khẩu */}
            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              value={password}  
              onChangeText={setPassword}  
              secureTextEntry // Bật chế độ ẩn ký tự bảo mật mật khẩu
              error={errors.password}  
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />}
            />

            {/* Nút điều hướng sang luồng khôi phục tài khoản khi quên mật khẩu */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Component Button tùy biến để thực thi kích hoạt gửi form */}
            <Button
              title="Đăng nhập"
              onPress={handleLogin}  
              loading={isLoading} // Tự động hiển thị spinner loading dựa trên trạng thái Redux Store
              style={styles.loginButton}
            />
          </View>

          {/* KHU VỰC FOOTER 1: Điều hướng đăng ký tài khoản cho Ứng viên thông thường (USER) */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>

          {/* KHU VỰC FOOTER 2: Điều hướng đăng ký tài khoản đặc quyền cho Nhà tuyển dụng (HR) */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Bạn là nhà tuyển dụng? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RegisterHr')}>
              <Text style={styles.registerLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Cấu hình hệ thống Stylesheet cho các thành phần giao diện của màn hình Đăng nhập
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
    flexGrow: 1, // Bảo đảm nội dung phủ kín màn hình ngay cả khi ngắn, hỗ trợ scroll khi phím bật
    paddingHorizontal: SIZES.padding,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.primary + '10', // Trộn màu chủ đạo với 10% opacity tạo màu nền nhạt sang trọng
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    marginBottom: 30,
  },
  forgotPassword: {
    alignSelf: 'flex-end', // Đẩy component liên kết căn lề về góc bên phải màn hình
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row', // Định hướng hiển thị dòng chữ và link điều hướng nằm ngang hàng nhau
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: COLORS.gray[500],
    fontSize: SIZES.md,
  },
  registerLink: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});

export default LoginScreen;