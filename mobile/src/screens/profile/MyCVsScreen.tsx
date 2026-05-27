import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SIZES } from '../../constants';
import { CVCard, Loading, EmptyState, Input } from '../../components';
import { userCVService } from '../../services/userCVService';
import { onlineCVService, IOnlineCV } from '../../services/onlineCVService';
import api from '../../services/api';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { IUserCV } from '../../types';

type MyCVsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyCVs'>;
};

// ---------- Tab type ----------
type TabKey = 'online' | 'uploaded';

const MyCVsScreen: React.FC<MyCVsScreenProps> = ({ navigation }) => {
  const [cvs, setCvs] = useState<IUserCV[]>([]);
  const [draftCVs, setDraftCVs] = useState<IOnlineCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [cvName, setCvName] = useState('');
  const [pickedFile, setPickedFile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('online');

  // Edit CV states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCV, setEditingCV] = useState<IUserCV | null>(null);
  const [editCvName, setEditCvName] = useState('');
  const [saving, setSaving] = useState(false);

  // ---------- Derived data ----------
  // Online CVs = exported online CVs (UserCV with onlineCvId) + drafts
  const onlineExportedCVs = useMemo(
    () => cvs.filter((cv) => !!cv.onlineCvId),
    [cvs],
  );
  // Uploaded CVs = UserCV without onlineCvId
  const uploadedCVs = useMemo(
    () => cvs.filter((cv) => !cv.onlineCvId),
    [cvs],
  );

  const onlineCount = draftCVs.length + onlineExportedCVs.length;
  const uploadedCount = uploadedCVs.length;

  // ---------- Data loading ----------
  useFocusEffect(
    useCallback(() => {
      loadCVs();
    }, []),
  );

  const loadCVs = async () => {
    try {
      const [cvsResponse, draftsResponse] = await Promise.all([
        userCVService.getMyCVs(),
        onlineCVService.getMyOnlineCVs(),
      ]);
      setCvs(cvsResponse.data || []);
      const allOnlineCVs = draftsResponse.data || [];
      setDraftCVs(allOnlineCVs.filter((cv: IOnlineCV) => !cv.pdfUrl));
    } catch (error) {
      console.error('Failed to load CVs:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCVs();
    setRefreshing(false);
  };

  // ---------- Upload handlers ----------
  const handleUploadCV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
      });

      if ((result as any).type === 'cancel' || (result as any).canceled === true) return;

      const picked: any = result;
      const asset = picked.assets?.[0] || picked;

      const file = {
        uri: asset.uri || asset.fileUri || picked.uri || picked.fileUri || '',
        mimeType: asset.mimeType || asset.type || picked.mimeType || picked.type || 'application/pdf',
        name: asset.name || asset.fileName || picked.name || picked.fileName || 'upload.pdf',
        webFile: picked.file || picked.output?.[0] || asset.file || null,
      };

      if (!file.uri) {
        Alert.alert('Lỗi', 'Không tìm thấy đường dẫn file. Vui lòng thử lại.');
        return;
      }

      const isWeb = typeof window !== 'undefined' && !!(window as any).document;
      if (!isWeb) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setPickedFile(file);
      setCvName((file.name || '').replace(/\.[^/.]+$/, ''));
      setShowNameModal(true);
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const handleConfirmUpload = async () => {
    if (!cvName?.trim() || !pickedFile) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên CV và chọn file');
      return;
    }

    setUploading(true);
    try {
      const uploadForm = new FormData();
      const isWeb = typeof window !== 'undefined' && !!(window as any).document;

      if (isWeb && pickedFile.webFile) {
        uploadForm.append('fileUpload', pickedFile.webFile);
      } else if (isWeb) {
        const response = await fetch(pickedFile.uri);
        const blobData = await response.blob();
        const mimeType = pickedFile.mimeType || 'application/pdf';
        const file = new File([blobData], pickedFile.name, { type: mimeType });
        uploadForm.append('fileUpload', file);
      } else {
        let fileUri = pickedFile.uri || '';
        if (fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
          fileUri = 'file://' + fileUri;
        }
        if (!fileUri) throw new Error('Không tìm thấy đường dẫn file');

        uploadForm.append('fileUpload', {
          uri: fileUri,
          type: pickedFile.mimeType || 'application/pdf',
          name: pickedFile.name || 'upload.pdf',
        } as any);
      }

      let uploadResp;
      let lastError;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          uploadResp = await api.post('/files/upload', uploadForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: (data) => data,
            timeout: 60000,
          });
          break;
        } catch (err: any) {
          lastError = err;
          if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 500));
        }
      }

      if (!uploadResp) throw lastError || new Error('Upload failed after retries');

      const uploadedUrl = uploadResp?.data?.url || uploadResp?.data?.data?.url || uploadResp?.data;
      if (!uploadedUrl) throw new Error('Không nhận được đường dẫn file từ server');

      await userCVService.createCV({ url: uploadedUrl, title: cvName.trim() });
      await loadCVs();

      setShowNameModal(false);
      setPickedFile(null);
      setCvName('');
      // Switch to uploaded tab to show the new CV
      setActiveTab('uploaded');
      Alert.alert('Thành công', 'Tải CV lên thành công');
    } catch (error: any) {
      console.error('Upload error', error);
      Alert.alert('Lỗi', error.response?.data?.message || error.message || 'Không thể tải CV');
    } finally {
      setUploading(false);
    }
  };

  // ---------- CV actions ----------
  const handleSetPrimary = async (cvId: string) => {
    try {
      await userCVService.setPrimaryCv(cvId);
      await loadCVs();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể đặt CV chính');
    }
  };

  const handleDeleteCV = (cv: IUserCV) => {
    Alert.alert('Xóa CV', `Bạn có chắc chắn muốn xóa "${cv.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await userCVService.deleteCV(cv._id);
            await loadCVs();
          } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa CV');
          }
        },
      },
    ]);
  };

  const handleViewCV = (cv: IUserCV) => {
    if (cv.url) Linking.openURL(cv.url);
  };

  const handleEditCV = (cv: IUserCV) => {
    if (cv.onlineCvId) {
      Alert.alert('Chỉnh sửa CV', 'Bạn muốn chỉnh sửa gì?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đổi tên',
          onPress: () => {
            setEditingCV(cv);
            setEditCvName(cv.title || '');
            setShowEditModal(true);
          },
        },
        {
          text: 'Sửa nội dung',
          onPress: () => {
            navigation.navigate('CVFormScreen', {
              templateType: '',
              cvId: cv.onlineCvId,
            });
          },
        },
      ]);
    } else {
      setEditingCV(cv);
      setEditCvName(cv.title || '');
      setShowEditModal(true);
    }
  };

  const handleSaveEditName = async () => {
    if (!editingCV || !editCvName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên CV');
      return;
    }

    setSaving(true);
    try {
      await userCVService.updateCV(editingCV._id, { title: editCvName.trim() });
      await loadCVs();
      setShowEditModal(false);
      setEditingCV(null);
      setEditCvName('');
      Alert.alert('Thành công', 'Đã cập nhật tên CV');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật CV');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Render helpers ----------
  const renderDraftCard = (draft: IOnlineCV) => (
    <TouchableOpacity
      key={draft._id}
      style={styles.draftCard}
      onPress={() =>
        navigation.navigate('CVFormScreen', {
          templateType: draft.templateType,
          cvId: draft._id,
        })
      }
    >
      <View style={styles.draftIcon}>
        <Ionicons
          name={draft.templateType === 'template1' ? 'document-text' : 'grid'}
          size={24}
          color={COLORS.primary}
        />
      </View>
      <View style={styles.draftInfo}>
        <View style={styles.draftBadge}>
          <Text style={styles.draftBadgeText}>Bản nháp</Text>
        </View>
        <Text style={styles.draftName} numberOfLines={1}>
          {draft.fullName || 'Chưa có tên'}
        </Text>
        <Text style={styles.draftTemplate}>
          {draft.templateType === 'template1' ? 'Mẫu cơ bản' : 'Mẫu hiện đại'}
        </Text>
        <Text style={styles.draftDate}>
          Cập nhật: {new Date(draft.updatedAt).toLocaleDateString('vi-VN')}
        </Text>
      </View>
      <View style={styles.draftActions}>
        <TouchableOpacity
          style={styles.draftActionBtn}
          onPress={() => {
            Alert.alert('Xóa bản nháp', 'Bạn có chắc muốn xóa bản nháp này?', [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await onlineCVService.deleteOnlineCV(draft._id);
                    await loadCVs();
                  } catch {
                    Alert.alert('Lỗi', 'Không thể xóa bản nháp');
                  }
                },
              },
            ]);
          }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </View>
    </TouchableOpacity>
  );

  const renderOnlineTab = () => {
    if (onlineCount === 0) {
      return (
        <View style={styles.tabEmptyContainer}>
          <View style={styles.tabEmptyIcon}>
            <Ionicons name="create-outline" size={48} color={COLORS.primary + '40'} />
          </View>
          <Text style={styles.tabEmptyTitle}>Chưa có CV online nào</Text>
          <Text style={styles.tabEmptyMessage}>
            Tạo CV trực tiếp trên hệ thống với các mẫu chuyên nghiệp
          </Text>
          <TouchableOpacity
            style={styles.tabEmptyAction}
            onPress={() => navigation.navigate('CVTemplateSelect')}
          >
            <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
            <Text style={styles.tabEmptyActionText}>Tạo CV online</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {/* Drafts */}
        {draftCVs.length > 0 && (
          <View style={styles.subSection}>
            <View style={styles.subSectionHeader}>
              <View style={styles.subSectionDot} />
              <Text style={styles.subSectionTitle}>
                Đang chỉnh sửa ({draftCVs.length})
              </Text>
            </View>
            {draftCVs.map(renderDraftCard)}
          </View>
        )}

        {/* Exported online CVs */}
        {onlineExportedCVs.length > 0 && (
          <View style={styles.subSection}>
            {draftCVs.length > 0 && (
              <View style={styles.subSectionHeader}>
                <View style={[styles.subSectionDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.subSectionTitle}>
                  Đã hoàn thành ({onlineExportedCVs.length})
                </Text>
              </View>
            )}
            {onlineExportedCVs.map((item) => (
              <CVCard
                key={item._id}
                cv={item}
                onPress={() => handleViewCV(item)}
                onSetPrimary={() => handleSetPrimary(item._id)}
                onDelete={() => handleDeleteCV(item)}
                onEdit={() => handleEditCV(item)}
              />
            ))}
          </View>
        )}
      </>
    );
  };

  const renderUploadedTab = () => {
    if (uploadedCount === 0) {
      return (
        <View style={styles.tabEmptyContainer}>
          <View style={styles.tabEmptyIcon}>
            <Ionicons name="cloud-upload-outline" size={48} color={COLORS.primary + '40'} />
          </View>
          <Text style={styles.tabEmptyTitle}>Chưa tải CV nào lên</Text>
          <Text style={styles.tabEmptyMessage}>
            Tải file CV (PDF, DOCX) từ thiết bị của bạn lên hệ thống
          </Text>
          <TouchableOpacity
            style={[styles.tabEmptyAction, { backgroundColor: COLORS.primary }]}
            onPress={handleUploadCV}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={COLORS.white} />
            <Text style={styles.tabEmptyActionText}>Tải lên CV</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {uploadedCVs.map((item) => (
          <CVCard
            key={item._id}
            cv={item}
            onPress={() => handleViewCV(item)}
            onSetPrimary={() => handleSetPrimary(item._id)}
            onDelete={() => handleDeleteCV(item)}
            onEdit={() => handleEditCV(item)}
          />
        ))}
      </>
    );
  };

  // ---------- Main render ----------
  if (loading) {
    return <Loading fullScreen text="Đang tải CV..." />;
  }

  const totalCVs = onlineCount + uploadedCount;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CV của tôi</Text>
      </View>

      {/* Info banner */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.info} />
        <Text style={styles.infoText}>
          Chọn một CV làm CV chính, CV này sẽ được tự động chọn khi ứng tuyển.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'online' && styles.tabActive]}
          onPress={() => setActiveTab('online')}
        >
          <Ionicons
            name="laptop-outline"
            size={16}
            color={activeTab === 'online' ? COLORS.primary : COLORS.gray[400]}
          />
          <Text
            style={[styles.tabText, activeTab === 'online' && styles.tabTextActive]}
          >
            Tạo trên hệ thống
          </Text>
          {onlineCount > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === 'online' && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'online' && styles.tabBadgeTextActive,
                ]}
              >
                {onlineCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'uploaded' && styles.tabActive]}
          onPress={() => setActiveTab('uploaded')}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={16}
            color={activeTab === 'uploaded' ? COLORS.primary : COLORS.gray[400]}
          />
          <Text
            style={[styles.tabText, activeTab === 'uploaded' && styles.tabTextActive]}
          >
            Đã tải lên
          </Text>
          {uploadedCount > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === 'uploaded' && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'uploaded' && styles.tabBadgeTextActive,
                ]}
              >
                {uploadedCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab action button */}
      <View style={styles.tabActionRow}>
        {activeTab === 'online' ? (
          <TouchableOpacity
            style={[styles.tabActionBtn, { backgroundColor: COLORS.success }]}
            onPress={() => navigation.navigate('CVTemplateSelect')}
          >
            <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
            <Text style={styles.tabActionBtnText}>Tạo CV online</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.tabActionBtn, { backgroundColor: COLORS.primary }]}
            onPress={handleUploadCV}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={COLORS.white} />
                <Text style={styles.tabActionBtnText}>Tải lên CV</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'online' ? renderOnlineTab() : renderUploadedTab()}
      </ScrollView>

      {/* Upload name modal */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Đặt tên CV</Text>
            <Input placeholder="Tên CV" value={cvName} onChangeText={setCvName} />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setShowNameModal(false);
                  setPickedFile(null);
                }}
                disabled={uploading}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm, uploading && styles.modalButtonDisabled]}
                onPress={handleConfirmUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={[styles.modalButtonText, { color: COLORS.white, marginLeft: 8 }]}>
                      Đang tải...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit name modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Đổi tên CV</Text>
            <Input placeholder="Tên CV" value={editCvName} onChangeText={setEditCvName} />
            {editingCV?.onlineCvId && (
              <Text style={styles.editHint}>
                Đây là CV tạo online. Bạn có thể sửa nội dung trong màn hình chi tiết.
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingCV(null);
                  setEditCvName('');
                }}
                disabled={saving}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm, saving && styles.modalButtonDisabled]}
                onPress={handleSaveEditName}
                disabled={saving}
              >
                {saving ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={[styles.modalButtonText, { color: COLORS.white, marginLeft: 8 }]}>
                      Đang lưu...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  // Info
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '10',
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.info,
    lineHeight: 18,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SIZES.padding,
    backgroundColor: COLORS.gray[100],
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray[400],
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: COLORS.gray[200],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primary + '15',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray[500],
  },
  tabBadgeTextActive: {
    color: COLORS.primary,
  },
  // Tab action row
  tabActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SIZES.padding,
    marginBottom: 8,
  },
  tabActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radius,
    gap: 6,
  },
  tabActionBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: SIZES.sm,
  },
  // Scroll / list
  scrollContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 24,
  },
  // Sub-section (within a tab)
  subSection: {
    marginBottom: 16,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  subSectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
  },
  subSectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  // Draft card
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    borderStyle: 'dashed',
  },
  draftIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftInfo: {
    flex: 1,
    marginLeft: 12,
  },
  draftBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warning + '18',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
    textTransform: 'uppercase',
  },
  draftName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  draftTemplate: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    marginTop: 2,
  },
  draftDate: {
    fontSize: 11,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  draftActionBtn: {
    padding: 6,
  },
  // Tab empty state
  tabEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  tabEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tabEmptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  tabEmptyMessage: {
    fontSize: SIZES.sm,
    color: COLORS.gray[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  tabEmptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 6,
  },
  tabEmptyActionText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: SIZES.md,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.gray[800],
  },
  editHint: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancel: {
    backgroundColor: COLORS.gray[200],
  },
  modalConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
    color: COLORS.gray[800],
  },
});

export default MyCVsScreen;
