import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { UploadLogo } from '@/components/company/UploadLogo';
import { companyService } from '../../../services/companyService';
import { COLORS } from '../../../constants';
import { useNavigation } from '@react-navigation/native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { useAppDispatch } from '../../../store/hooks';
import { getProfile } from '../../../store/slices/authSlice';

const HrCreateCompanyScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const editor = useRef<RichEditor>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    logo: '',
    description: '',
    taxCode: '',
    scale: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Tên công ty không được để trống';
    if (!formData.address) newErrors.address = 'Địa chỉ công ty không được để trống';
    if (!formData.logo) newErrors.logo = 'Logo công ty không được để trống';
    if (!formData.description) newErrors.description = 'Mô tả công ty không được để trống';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickAndUpload = async () => {
    setIsLogoUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled) {
        setIsLogoUploading(false);
        return;
      }
      const asset = result.assets[0];
      let fileUri = asset.uri;
      if (fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
        fileUri = 'file://' + fileUri;
      }
      const isWeb = typeof window !== 'undefined' && !!(window as any).document;
      if (!isWeb) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      const uploadForm = new FormData();
      if (isWeb && asset.file) {
        uploadForm.append('fileUpload', asset.file);
      } else if (isWeb) {
        const response = await fetch(fileUri);
        const blobData = await response.blob();
        const mimeType = asset.mimeType || 'image/jpeg';
        const file = new File([blobData], asset.fileName || 'logo.jpg', { type: mimeType });
        uploadForm.append('fileUpload', file);
      } else {
        uploadForm.append('fileUpload', {
          uri: fileUri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'logo.jpg',
        } as any);
      }
      let uploadResp;
      let lastError;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          uploadResp = await api.post('/files/upload-image', uploadForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: (data) => data,
            timeout: 60000,
          });
          break;
        } catch (err: any) {
          lastError = err;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
        }
      }
      if (!uploadResp) throw lastError || new Error('Upload failed');
      const uploadedUrl = uploadResp?.data?.url || uploadResp?.data?.data?.url || uploadResp?.data;
      if (!uploadedUrl) throw new Error('Không nhận được đường dẫn file từ server');
      setFormData((prev) => ({ ...prev, logo: uploadedUrl }));
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Không thể tải logo';
      Alert.alert('Lỗi', message);
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await companyService.createCompanyByHr({
        name: formData.name,
        address: formData.address,
        logo: formData.logo,
        description: formData.description,
        taxCode: formData.taxCode || undefined,
        scale: formData.scale || undefined,
      });
      // Refresh user profile to get updated company info
      await dispatch(getProfile());
      Alert.alert('Thành công', 'Tạo công ty thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Không thể tạo công ty';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Logo công ty *</Text>
            </View>
            <View style={styles.logoContainer}>
              <UploadLogo
                uri={formData.logo}
                onPress={pickAndUpload}
                loading={isLogoUploading}
              />
              {errors.logo && <Text style={styles.errorText}>{errors.logo}</Text>}
            </View>
          </View>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            </View>
            <Input
              label="Tên công ty *"
              placeholder="Nhập tên công ty"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              error={errors.name}
              leftIcon={null}
            />
            <Input
              label="Địa chỉ công ty *"
              placeholder="Nhập địa chỉ công ty"
              value={formData.address}
              onChangeText={(value) => updateField('address', value)}
              error={errors.address}
              leftIcon={null}
            />
            <Input
              label="Mã số thuế"
              placeholder="Nhập mã số thuế (tùy chọn)"
              value={formData.taxCode}
              onChangeText={(value) => updateField('taxCode', value)}
              leftIcon={null}
            />
            <Input
              label="Quy mô công ty"
              placeholder="VD: 1-10, 10-50, 50-200, 200+"
              value={formData.scale}
              onChangeText={(value) => updateField('scale', value)}
              leftIcon={null}
            />
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Mô tả công ty *</Text>
            </View>
            <View style={styles.editorContainer}>
              <RichToolbar
                editor={editor}
                style={styles.richToolbar}
                iconSize={18}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.setUnderline,
                  actions.insertBulletsList,
                  actions.insertOrderedList,
                  actions.heading1,
                  actions.heading2,
                ]}
              />
              <RichEditor
                ref={editor}
                placeholder="Nhập mô tả chi tiết về công ty, văn hóa, phúc lợi..."
                style={styles.richEditor}
                initialHeight={200}
                onChange={(html) => updateField('description', html)}
                editorStyle={{
                  backgroundColor: COLORS.white,
                  color: COLORS.gray[800],
                  placeholderColor: COLORS.gray[400],
                  contentCSSText: 'font-size: 14px; line-height: 22px;',
                }}
              />
            </View>
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          <Button
            title="Tạo công ty"
            onPress={handleCreate}
            loading={loading}
            style={styles.createButton}
          />

          <View style={styles.tipsCard}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
            <View style={styles.tipsContent}>
              <Text style={styles.tipsTitle}>Mẹo thu hút ứng viên</Text>
              <Text style={styles.tipsText}>
                • Mô tả chi tiết về văn hóa công ty{'\n'}
                • Liệt kê các phúc lợi hấp dẫn{'\n'}
                • Chia sẻ câu chuyện thành công
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  logoContainer: {
    alignItems: 'center',
  },
  editorContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    overflow: 'hidden',
  },
  richEditor: {
    minHeight: 200,
    backgroundColor: COLORS.white,
  },
  richToolbar: {
    backgroundColor: COLORS.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 8,
  },
  createButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
});

export default HrCreateCompanyScreen;
