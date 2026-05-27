import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { UploadLogo } from '@/components/company/UploadLogo';
import { useAppSelector } from '../../../store/hooks';
import { companyService } from '../../../services/companyService';
import { COLORS } from '../../../constants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Loading } from '../../../components/common/Loading';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

const HrCompanyUpdateScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.company?._id;
  const companyData = (route.params as any)?.company;
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyLogoUrl: '',
    companyDescription: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const editor = useRef<RichEditor>(null);

  useEffect(() => {
    if (companyData) {
      setFormData({
        companyName: companyData.name || '',
        companyAddress: companyData.address || '',
        companyLogoUrl: companyData.logo || '',
        companyDescription: companyData.description || '',
      });
    }
  }, [companyData]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName) newErrors.companyName = 'Tên công ty không được để trống';
    if (!formData.companyAddress) newErrors.companyAddress = 'Địa chỉ công ty không được để trống';
    if (!formData.companyLogoUrl) newErrors.companyLogoUrl = 'Logo công ty không được để trống';
    if (!formData.companyDescription) newErrors.companyDescription = 'Mô tả công ty không được để trống';
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
      if (
        fileUri &&
        !fileUri.startsWith('file://') &&
        !fileUri.startsWith('content://')
      ) {
        fileUri = 'file://' + fileUri;
      }

      const isWeb = typeof window !== 'undefined' && !!(window as any).document;
      if (!isWeb) {
        await new Promise(resolve => setTimeout(resolve, 300));
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
      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          uploadResp = await api.post('/files/upload-image', uploadForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: (data) => data,
            timeout: 60000,
          });
          break;
        } catch (err: any) {
          lastError = err;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      if (!uploadResp) {
        throw lastError || new Error('Upload failed after retries');
      }
      const uploadedUrl = uploadResp?.data?.url || uploadResp?.data?.data?.url || uploadResp?.data;
      if (!uploadedUrl) {
        throw new Error('Không nhận được đường dẫn file từ server');
      }
      setFormData((prev) => ({
        ...prev,
        companyLogoUrl: uploadedUrl,
      }));
    } catch (error) {
      console.error('Upload error:', error);
      let message = 'Không thể tải logo';
      if (typeof error === 'object' && error !== null) {
        if ('response' in error && typeof (error as any).response?.data?.message === 'string') {
          message = (error as any).response.data.message;
        } else if ('message' in error && typeof (error as any).message === 'string') {
          message = (error as any).message;
        }
      }
      Alert.alert('Lỗi', message);
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await companyService.updateCompanyByHr(companyId as string, {
        name: formData.companyName,
        address: formData.companyAddress,
        logo: formData.companyLogoUrl,
        description: formData.companyDescription,
      });
      Alert.alert('Thành công', 'Cập nhật thông tin công ty thành công', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin công ty');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

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
              <Text style={styles.sectionTitle}>Logo công ty</Text>
            </View>
            <View style={styles.logoContainer}>
              <UploadLogo
                uri={formData.companyLogoUrl}
                onPress={pickAndUpload}
                loading={isLogoUploading}
              />
              {errors.companyLogoUrl && (
                <Text style={styles.errorText}>{errors.companyLogoUrl}</Text>
              )}
            </View>
          </View>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            </View>
            <Input
              label="Tên công ty"
              placeholder="Nhập tên công ty"
              value={formData.companyName}
              onChangeText={(value) => updateField('companyName', value)}
              error={errors.companyName}
              leftIcon={null}
            />
            <Input
              label="Địa chỉ công ty"
              placeholder="Nhập địa chỉ công ty"
              value={formData.companyAddress}
              onChangeText={(value) => updateField('companyAddress', value)}
              error={errors.companyAddress}
              leftIcon={null}
            />
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Mô tả công ty</Text>
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
                initialContentHTML={formData.companyDescription}
                onChange={(html) => updateField('companyDescription', html)}
                editorStyle={{
                  backgroundColor: COLORS.white,
                  color: COLORS.gray[800],
                  placeholderColor: COLORS.gray[400],
                  contentCSSText: 'font-size: 14px; line-height: 22px;',
                }}
              />
            </View>
            {errors.companyDescription && (
              <Text style={styles.errorText}>{errors.companyDescription}</Text>
            )}
          </View>

          {/* Submit Button */}
          <Button
            title="Cập nhật thông tin"
            onPress={handleUpdate}
            loading={loading}
            style={styles.updateButton}
          />

          {/* Tips Card */}
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
  updateButton: { 
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

export default HrCompanyUpdateScreen;
