import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../../constants';
import { Button, Input } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getProfile } from '../../store/slices/authSlice';
import { userService } from '../../services/userService';
import { RootStackParamList } from '../../navigation/AppNavigator';

/**
 * Định nghĩa kiểu dữ liệu cho Props của màn hình EditProfileScreen
 */
type EditProfileScreenProps = {
  // Đối tượng navigation hỗ trợ quay lui hoặc dịch chuyển màn hình trong Stack
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
};

/**
 * Màn hình Chỉnh sửa hồ sơ (EditProfileScreen) cho phép người dùng thay đổi thông tin cá nhân,
 * chụp hoặc chọn ảnh từ thư viện, upload ảnh đại diện lên server và đồng bộ dữ liệu với Redux Store.
 */
const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  // --- REDUX HOOKS ---
  const dispatch = useAppDispatch();
  // API gọi ngoài (Redux): Lấy thông tin user hiện tại từ auth slice để đổ dữ liệu mặc định vào Form
  const { user } = useAppSelector((state) => state.auth);

  // --- LOCAL STATES ---
  // Khởi tạo trạng thái form tập trung (Form Object Pattern), nạp sẵn data hiện tại của user
  const [formData, setFormData] = useState({
    name: user?.name || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
    address: user?.address || '',
    avatar: user?.avatar || '',
  });
  const [loading, setLoading] = useState(false);          // Trạng thái chờ khi bấm lưu thông tin toàn form
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // Trạng thái chờ riêng khi đang tiến hành upload hình ảnh đại diện
  const [errors, setErrors] = useState<Record<string, string>>({}); // Đối tượng lưu văn bản lỗi kiểm tra tính hợp lệ (Validation)

  // --- LOGIC FUNCTIONS ---

  /**
   * Hàm nội bộ: Kiểm tra điều kiện bắt buộc điền và ràng buộc nghiệp vụ (ví dụ: tuổi phải lớn hơn hoặc bằng 18)
   */
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Họ tên không được để trống';
    }

    if (!formData.age) {
      newErrors.age = 'Tuổi không được để trống';
    } else if (isNaN(Number(formData.age)) || Number(formData.age) < 18) {
      newErrors.age = 'Tuổi phải là số và >= 18';
    }

    setErrors(newErrors);
    // Trả về true nếu object lưu lỗi trống (không có bất kỳ trường nào vi phạm quy tắc)
    return Object.keys(newErrors).length === 0;
  };

  /**
   * API gọi ngoài (userService & Redux): Thực hiện gửi toàn bộ thông tin form đã chỉnh sửa lên máy chủ
   */
  const handleSave = async () => {
    if (!validate()) return; // Dừng tiến trình nếu dữ liệu không vượt qua hàm kiểm tra validate

    setLoading(true);
    try {
      // 1. Gửi lệnh cập nhật hồ sơ chữ thông thường sang userService
      await userService.updateProfile({
        name: formData.name.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        address: formData.address.trim(),
        avatar: formData.avatar,
      });

      // 2. API gọi ngoài (Redux): Dispatch thunk action 'getProfile' nhằm tải lại thông tin mới nhất đồng bộ lên Store toàn cục
      await dispatch(getProfile());

      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công', [
        { text: 'OK', onPress: () => navigation.goBack() }, // Quay về màn hình trước (thường là Profile) sau khi thành công
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  /**
   * API gọi ngoài (expo-image-picker): Xin quyền tiếp cận và khởi động thư viện hình ảnh của thiết bị di động
   */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện');
      return;
    }

    // Kích hoạt giao diện chọn ảnh từ album
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Chỉ hiển thị tệp tin định dạng ảnh công nghệ
      allowsEditing: true,  // Cho phép người dùng cắt (crop) ảnh trước khi chọn
      aspect: [1, 1],       // Ép tỷ lệ cắt ảnh vuông [1:1] phù hợp làm avatar
      quality: 0.8,         // Nén chất lượng hình ảnh về mức 80% để giảm tải dung lượng tệp tin gửi đi
    });

    // Nếu người dùng không nhấn hủy và tệp ảnh tồn tại hợp lệ -> Gửi uri đi upload
    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  /**
   * API gọi ngoài (expo-image-picker): Xin quyền sử dụng camera vật lý và kích hoạt ứng dụng chụp ảnh
   */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập camera để chụp ảnh');
      return;
    }

    // Khởi động camera chụp ảnh trực tiếp
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  /**
   * API gọi ngoài (userService): Đóng gói ảnh đại diện vào cấu trúc FormData và tải lên máy chủ (xử lý cross-platform)
   */
  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      let fileUri = uri;
      // Chuẩn hóa đường dẫn URI tệp tin thích ứng cho các nền tảng thiết bị di động đặc thù
      if (fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
        fileUri = 'file://' + fileUri;
      }

      // Logic rẽ nhánh: Kiểm tra ứng dụng có đang chạy trên môi trường Web (Browser) hay không
      const isWeb = typeof window !== 'undefined' && !!(window as any).document;
      if (!isWeb) {
        // Tạo khoảng trễ ngắn (300ms) trên Mobile đảm bảo hệ thống tệp tin đã ghi và sẵn sàng truy xuất
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Tạo đối tượng dữ liệu FormData đa phần để xử lý tải file lên API
      const uploadForm = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg'; // Trích xuất tên file từ cuối đường dẫn URI
      const match = /\.(\w+)$/.exec(filename);               // Sử dụng Regex để đọc phần mở rộng của file
      const mimeType = match ? `image/${match[1]}` : 'image/jpeg'; // Định nghĩa kiểu MIME loại ảnh (ví dụ image/png)

      if (isWeb) {
        // Xử lý tệp dữ liệu trên nền tảng Web: Chuyển đổi file URI sang cấu trúc Blob và File của trình duyệt
        const response = await fetch(fileUri);
        const blobData = await response.blob();
        const file = new File([blobData], filename, { type: mimeType });
        uploadForm.append('fileUpload', file);
      } else {
        // Xử lý tệp dữ liệu trên nền tảng Native di động: Đóng gói đối tượng chứa uri, loại file và tên
        uploadForm.append('fileUpload', {
          uri: fileUri,
          type: mimeType,
          name: filename,
        } as any);
      }

      // --- CƠ CHẾ TỰ ĐỘNG THỬ LẠI (RETRY LOGIC) ---
      // Tiến hành thử lại tối đa 2 lần nếu tiến trình gọi mạng upload ảnh gặp sự cố nghẽn mạng đột ngột
      let uploadResp;
      let lastError;
      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          uploadResp = await userService.uploadAvatar(uploadForm);
          break; // Bứt phá ra khỏi vòng lặp ngay khi gọi API upload thành công
        } catch (err: any) {
          lastError = err;
          if (attempt < maxRetries) {
            // Chờ 500ms trước khi kích hoạt đợt thử nghiệm upload tiếp theo
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (!uploadResp) {
        throw lastError || new Error('Upload failed after retries');
      }

      // Trích xuất linh hoạt URL ảnh trả về tùy theo định dạng bọc cấu trúc của Backend API
      const uploadedUrl = (uploadResp as any)?.data?.url || (uploadResp as any)?.url || (uploadResp as any)?.data;
      if (!uploadedUrl) {
        throw new Error('Không nhận được đường dẫn file từ server');
      }

      // Cập nhật URL ảnh mới nhận được từ server vào state form cục bộ để hiển thị preview
      setFormData((prev) => ({ ...prev, avatar: uploadedUrl }));
    } catch (error: any) {
      console.error('Upload error:', error);
      let message = 'Không thể tải lên ảnh';
      if (typeof error === 'object' && error !== null) {
        if ('response' in error && typeof (error as any).response?.data?.message === 'string') {
          message = (error as any).response.data.message;
        } else if ('message' in error && typeof (error as any).message === 'string') {
          message = (error as any).message;
        }
      }
      Alert.alert('Lỗi', message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  /**
   * Hàm nội bộ: Hiển thị bảng chọn lựa (Action Sheet/Alert) để người dùng quyết định nguồn ảnh đại diện
   */
  const showImageOptions = () => {
    Alert.alert('Chọn ảnh đại diện', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: takePhoto },
      { text: 'Chọn từ thư viện', onPress: pickImage },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  /**
   * Hàm nội bộ: Cập nhật động dữ liệu cho từng ô thuộc tính trong formData 
   * đồng thời tự động xóa thông báo lỗi của ô đó ngay khi người dùng gõ ký tự chỉnh sửa mới
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
      {/* KeyboardAvoidingView: Tự động tính toán nâng UI tránh bị bàn phím ảo che lấp các Input phía dưới */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} // Khóa thanh cuộn vật lý tăng tính thẩm mỹ
        >
          {/* KHU VỰC AVATAR (Hiển thị ảnh đại diện vòng tròn, vòng xoay chờ upload và huy hiệu icon máy ảnh) */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={showImageOptions} disabled={uploadingAvatar}>
              <View style={styles.avatarContainer}>
                {uploadingAvatar ? (
                  // Hiển thị chỉ báo vòng xoay chờ tải tệp tin (ActivityIndicator) nếu đang upload ảnh
                  <ActivityIndicator size="large" color={COLORS.primary} />
                ) : formData.avatar ? (
                  <Image source={{ uri: formData.avatar }} style={styles.avatar} />
                ) : (
                  // Hiển thị khung trống biểu tượng hình người mặc định nếu tài khoản chưa cấu hình avatar URL
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={50} color={COLORS.gray[400]} />
                  </View>
                )}
                {/* Huy hiệu nhỏ hiển thị icon máy ảnh xếp đè ở góc phải dưới vòng tròn */}
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={16} color={COLORS.white} />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Nhấn để thay đổi ảnh đại diện</Text>
          </View>

          {/* KHU VỰC THÔNG TIN CHỮ (FORM inputs) */}
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
              label="Tuổi *"
              placeholder="Nhập tuổi của bạn"
              value={formData.age}
              onChangeText={(value) => updateField('age', value)}
              keyboardType="numeric" // Gọi bàn phím số chuyên dụng trên điện thoại
              error={errors.age}
              leftIcon={<Ionicons name="calendar-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Giới tính"
              placeholder="Nam / Nữ / Khác"
              value={formData.gender}
              onChangeText={(value) => updateField('gender', value)}
              leftIcon={<Ionicons name="male-female-outline" size={20} color={COLORS.gray[400]} />}
            />

            <Input
              label="Địa chỉ"
              placeholder="Nhập địa chỉ"
              value={formData.address}
              onChangeText={(value) => updateField('address', value)}
              multiline // Cho phép mở rộng ô nhập dữ liệu thành nhiều dòng văn bản
              numberOfLines={2} // Chiều cao mặc định hiển thị tương đương 2 dòng chữ
              leftIcon={<Ionicons name="location-outline" size={20} color={COLORS.gray[400]} />}
            />
          </View>
        </ScrollView>

        {/* KHU VỰC CỐ ĐỊNH Ở ĐÁY MÀN HÌNH (FOOTER): Chứa nút bấm Submit lưu thông tin */}
        <View style={styles.footer}>
          <Button title="Lưu thay đổi" onPress={handleSave} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Khởi tạo hệ thống Stylesheet cấu hình bố cục và giao diện cho màn hình EditProfile
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
    flexGrow: 1, // Đảm bảo ScrollView mở rộng phủ hết diện tích màn hình để căn bố cục chuẩn
    padding: SIZES.padding,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative', // Làm gốc định vị cho badge camera xếp tuyệt đối ở góc dưới
    width: 120,
    height: 120,
    borderRadius: 60, // Tạo hình tròn hoàn hảo (width / 2)
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Bo tròn góc cắt đứt phần thừa của ảnh góc vuông lồng bên trong
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white, // Tạo viền trắng bao quanh phân tách ranh giới badge với ảnh nền avatar
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.gray[500],
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
    borderTopColor: COLORS.gray[100], // Đường viền mỏng ngăn tách khối nút bấm cố định với vùng biểu mẫu cuộn phía trên
  },
});

export default EditProfileScreen;