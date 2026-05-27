import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { Button, Input } from '../../components';
import { userService } from '../../services/userService';
import { RootStackParamList } from '../../navigation/AppNavigator';

/**
 * Định nghĩa kiểu dữ liệu cho Props của màn hình ChangePasswordScreen
 */
type ChangePasswordScreenProps = {
  // Đối tượng navigation hỗ trợ điều hướng, quay lại trang trước đó trong Stack
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChangePassword'>;
};

/**
 * Màn hình Đổi mật khẩu (ChangePasswordScreen) xử lý logic xác thực mật khẩu cũ,
 * ràng buộc mật khẩu mới và gọi API cập nhật thông tin tài khoản người dùng.
 */
const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ navigation }) => {
  // --- LOCAL STATES ---
  // State quản lý tập trung dữ liệu các ô nhập trong form đổi mật khẩu
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false); // Trạng thái chờ khi gọi API
  const [errors, setErrors] = useState<Record<string, string>>({}); // Lưu trữ thông báo lỗi validate của từng ô nhập

  // --- LOGIC FUNCTIONS ---

  /**
   * Hàm nội bộ: Kiểm tra tính hợp lệ dữ liệu form (bắt buộc điền, độ dài mật khẩu mới, so khớp mật khẩu xác nhận)
   */
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Mật khẩu hiện tại không được để trống';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới không được để trống';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu không được để trống';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    // Trả về true nếu không phát hiện lỗi nào (object rỗng)
    return Object.keys(newErrors).length === 0;
  };

  /**
   * API gọi ngoài (userService): Gửi yêu cầu đổi mật khẩu lên server sau khi kiểm tra form hợp lệ
   */
  const handleChangePassword = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Gửi tham số mật khẩu cũ và mật khẩu mới lên backend
      await userService.changePassword(formData.currentPassword, formData.newPassword);
      
      Alert.alert('Thành công', 'Đổi mật khẩu thành công', [
        // Quay trở lại màn hình trước đó (thường là Profile/Settings) sau khi hoàn tất
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      // Bóc tách thông báo lỗi chi tiết do server phản hồi
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Hàm nội bộ: Cập nhật động dữ liệu cho từng thuộc tính của ô nhập 
   * đồng thời tự động xóa thông báo lỗi của ô đó ngay khi người dùng chỉnh sửa dữ liệu
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
      {/* KeyboardAvoidingView: Tự động dịch chuyển giao diện biểu mẫu khi bàn phím ảo hiển thị */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} // Ẩn thanh cuộn dọc vật lý
        >
          {/* KHU VỰC NHẬP LIỆU (FORM inputs) */}
          <View style={styles.form}>
            <Input
              label="Mật khẩu hiện tại *"
              placeholder="Nhập mật khẩu hiện tại"
              value={formData.currentPassword}
              onChangeText={(value) => updateField('currentPassword', value)}
              secureTextEntry // Ẩn ký tự để bảo mật mật khẩu
              error={errors.currentPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Mật khẩu mới *"
              placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
              value={formData.newPassword}
              onChangeText={(value) => updateField('newPassword', value)}
              secureTextEntry
              error={errors.newPassword}
              leftIcon={<Ionicons name="key-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Xác nhận mật khẩu mới *"
              placeholder="Nhập lại mật khẩu mới"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry
              error={errors.confirmPassword}
              leftIcon={<Ionicons name="key-outline" size={20} color={COLORS.gray[400]} />}
            />
          </View>
        </ScrollView>

        {/* KHU VỰC ĐÁY MÀN HÌNH (FOOTER): Nút bấm xác nhận gửi lệnh */}
        <View style={styles.footer}>
          <Button title="Đổi mật khẩu" onPress={handleChangePassword} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Khởi tạo hệ thống Stylesheet cấu hình giao diện cho màn hình Đổi mật khẩu
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
    flexGrow: 1, // Hỗ trợ vùng cuộn co giãn linh hoạt bao trọn nội dung biểu mẫu
    padding: SIZES.padding,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
  },
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100], // Tạo đường kẻ mảnh phân tách nút bấm với vùng form cuộn phía trên
  },
});

export default ChangePasswordScreen;