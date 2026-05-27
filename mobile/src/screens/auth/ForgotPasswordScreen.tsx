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
import { authService } from '../../services/authService';
import { RootStackParamList } from '../../navigation/AppNavigator';

/**
 * Định nghĩa kiểu dữ liệu cho Props của màn hình ForgotPasswordScreen
 */
type ForgotPasswordScreenProps = {
  // Đối tượng navigation hỗ trợ chuyển hướng trong Stack Navigator
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

/**
 * Màn hình Quên mật khẩu (ForgotPasswordScreen) xử lý luồng khôi phục tài khoản qua 3 bước:
 * Nhập Email -> Xác thực OTP -> Đặt lại mật khẩu mới.
 */
const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  // --- QUẢN LÝ TRẠNG THÁI (STATES) ---
  
  // Trạng thái bước hiện tại trong quy trình khôi phục
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState(''); // Token bảo mật trả về từ API sau khi xác thực OTP thành công
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);   // Trạng thái chờ khi gọi API
  const [error, setError] = useState('');           // Lưu văn bản lỗi hiển thị cho người dùng

  // --- HÀM XỬ LÝ LOGIC / GỌI API ---

  /**
   * BƯỚC 1: Xác thực định dạng email và yêu cầu hệ thống gửi mã OTP về Email ứng viên
   */
  const handleSendOTP = async () => {
    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }
    // Sử dụng Regex để kiểm tra định dạng email chuẩn
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // API gọi ngoài (authService): Gửi yêu cầu cấp OTP khôi phục mật khẩu
      await authService.forgotPassword(email);
      Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn');
      setStep('otp'); // Chuyển sang giao diện nhập mã OTP
    } catch (err: any) {
      // Bóc tách thông báo lỗi trả về từ phía Backend Server
      setError(err.response?.data?.message || 'Không thể gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  /**
   * BƯỚC 2: Gửi mã OTP lên server để xác thực quyền sở hữu tài khoản
   */
  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      setError('Vui lòng nhập mã OTP hợp lệ');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // API gọi ngoài (authService): Xác thực cặp thông tin Email & OTP nhập vào
      const response = await authService.verifyOtp(email, otp);
      // Lưu lại reset token nhận từ server để làm minh chứng hợp lệ khi gửi mật khẩu mới ở bước sau
      setResetToken(response.data?.token || otp);
      setStep('newPassword'); // Chuyển sang giao diện thiết lập mật khẩu mới
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã OTP không đúng');
    } finally {
      setLoading(false);
    }
  };

  /**
   * BƯỚC 3: Kiểm tra tính hợp lệ của mật khẩu mới và tiến hành cập nhật mật khẩu vào DB
   */
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // API gọi ngoài (authService): Đổi mật khẩu kèm theo mã Reset Token xác thực hợp lệ
      await authService.resetPassword(resetToken, newPassword);
      Alert.alert('Thành công', 'Mật khẩu đã được đặt lại', [
        // Điều hướng người dùng quay trở lại màn hình Đăng nhập (Login) sau khi thành công
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  // --- GIAO DIỆN TỪNG BƯỚC (SUB-RENDERS) ---

  /**
   * Render giao diện Nhập Email (Bước 1)
   */
  const renderEmailStep = () => (
    <>
      <Text style={styles.description}>
        Nhập email của bạn để nhận mã xác thực đặt lại mật khẩu
      </Text>
      <Input
        label="Email"
        placeholder="Nhập email của bạn"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={error}
        leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gray[400]} />}
      />
      <Button
        title="Gửi mã OTP"
        onPress={handleSendOTP}
        loading={loading}
        style={styles.button}
      />
    </>
  );

  /**
   * Render giao diện Nhập mã OTP (Bước 2)
   */
  const renderOTPStep = () => (
    <>
      <Text style={styles.description}>
        Nhập mã OTP đã được gửi đến email {email}
      </Text>
      <Input
        label="Mã OTP"
        placeholder="Nhập mã OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        error={error}
        leftIcon={<Ionicons name="keypad-outline" size={20} color={COLORS.gray[400]} />}
      />
      <Button
        title="Xác nhận"
        onPress={handleVerifyOTP}
        loading={loading}
        style={styles.button}
      />
      {/* Nút gửi lại mã OTP bằng cách tái sử dụng hàm handleSendOTP */}
      <TouchableOpacity style={styles.resendButton} onPress={handleSendOTP}>
        <Text style={styles.resendText}>Gửi lại mã OTP</Text>
      </TouchableOpacity>
    </>
  );

  /**
   * Render giao diện Thiết lập mật khẩu mới (Bước 3)
   */
  const renderNewPasswordStep = () => (
    <>
      <Text style={styles.description}>Tạo mật khẩu mới cho tài khoản của bạn</Text>
      <Input
        label="Mật khẩu mới"
        placeholder="Nhập mật khẩu mới"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry // Ẩn ký tự nhập vào để bảo mật mật khẩu
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />}
      />
      <Input
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu mới"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={error}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />}
      />
      <Button
        title="Đặt lại mật khẩu"
        onPress={handleResetPassword}
        loading={loading}
        style={styles.button}
      />
    </>
  );

  // --- GIAO DIỆN CHÍNH (MAIN RENDER) ---
  return (
    <SafeAreaView style={styles.container}>
      {/* KeyboardAvoidingView: Tự động đẩy giao diện lên khi bàn phím ảo hiển thị (Tránh che mất Input) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} // Ẩn thanh cuộn dọc vật lý
        >
          {/* NÚT BACK: Xử lý quay lui thông minh theo từng bước hoặc quay lại màn hình trước đó */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'email') {
                navigation.goBack(); // Nếu ở bước đầu tiên, quay lại màn Login
              } else if (step === 'otp') {
                setStep('email');    // Nếu ở bước OTP, lùi về bước nhập Email
              } else {
                setStep('otp');      // Nếu ở bước mật khẩu mới, lùi về bước nhập OTP
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>

          {/* KHU VỰC HEADER: Thay đổi linh hoạt Icon và Tiêu đề theo từng Step hiện tại */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={
                  step === 'email'
                    ? 'mail'
                    : step === 'otp'
                    ? 'keypad'
                    : 'lock-closed'
                }
                size={40}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.title}>
              {step === 'email'
                ? 'Quên mật khẩu'
                : step === 'otp'
                ? 'Xác thực OTP'
                : 'Mật khẩu mới'}
            </Text>
          </View>

          {/* KHU VỰC FORM: Hiển thị giao diện Form tương ứng với Step hiện tại */}
          <View style={styles.form}>
            {step === 'email' && renderEmailStep()}
            {step === 'otp' && renderOTPStep()}
            {step === 'newPassword' && renderNewPasswordStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Khởi tạo Stylesheet cấu hình giao diện giao diện của màn hình Quên mật khẩu
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
    flexGrow: 1, // Đảm bảo nội dung ScrollView co giãn phủ kín chiều cao màn hình để căn giữa hoặc tạo khoảng cách đúng
    paddingHorizontal: SIZES.padding,
    paddingVertical: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    // Trộn màu chủ đạo với mã độ trong suốt 10% tạo vòng tròn nền nhạt phía sau icon
    backgroundColor: COLORS.primary + '10', 
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  form: {
    flex: 1,
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    marginTop: 10,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;