import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { usersService } from '../../../services/usersService';
import { userCVService } from '../../../services/userCVService';
import { IUser, IUserCV } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS, SIZES } from '../../../constants';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type AdminStackParamList = {
  CandidateDetail: { userId: string };
};

type RouteParams = {
  params: {
    userId: string;
  };
};

const CandidateDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<StackNavigationProp<AdminStackParamList>>();
  const userId = (route.params as any)?.userId as string;

  const [user, setUser] = useState<IUser | null>(null);
  const [cvs, setCvs] = useState<IUserCV[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cvPreviewVisible, setCvPreviewVisible] = useState(false);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [userRes, cvsRes] = await Promise.all([
        usersService.getUserById(userId),
        usersService.getUserCVs(userId),
      ]);
      setUser(userRes.data);
      setCvs(cvsRes.data || []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải thông tin ứng viên');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, userId]);

  const handleLockUser = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await usersService.lockUser(userId, lockReason);
      Alert.alert('Thành công', 'Đã khóa tài khoản ứng viên');
      setLockModalVisible(false);
      setLockReason('');
      load();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể khóa tài khoản');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    if (!user) return;
    Alert.alert(
      'Mở khóa tài khoản',
      'Bạn có chắc chắn muốn mở khóa tài khoản này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Mở khóa',
          onPress: async () => {
            setActionLoading(true);
            try {
              await usersService.unlockUser(userId);
              Alert.alert('Thành công', 'Đã mở khóa tài khoản');
              load();
            } catch (err: any) {
              Alert.alert(
                'Lỗi',
                err.response?.data?.message || 'Không thể mở khóa tài khoản'
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewCV = (cv: IUserCV) => {
    const url = cv.url?.toLowerCase() || '';
    if (
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.png') ||
      url.endsWith('.webp')
    ) {
      setCvPreviewUrl(cv.url);
      setCvPreviewVisible(true);
    } else if (cv.url) {
      Linking.openURL(cv.url);
    }
  };

  if (loading || !user) return <Loading />;

  return (
    <>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* User Profile Card */}
          <View style={[styles.card, user.isLocked && styles.cardLocked]}>
            <View style={styles.profileHeader}>
              <View
                style={[
                  styles.avatar,
                  user.isLocked && styles.avatarLocked,
                ]}
              >
                <Text style={styles.avatarText}>
                  {user.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.isLocked && (
                  <View style={styles.lockedBadge}>
                    <Ionicons
                      name="lock-closed"
                      size={12}
                      color={COLORS.white}
                    />
                    <Text style={styles.lockedText}>Tài khoản đã bị khóa</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.infoSection}>
              {user.phone && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color={COLORS.gray[500]}
                  />
                  <Text style={styles.infoText}>{user.phone}</Text>
                </View>
              )}
              {user.address && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={COLORS.gray[500]}
                  />
                  <Text style={styles.infoText}>{user.address}</Text>
                </View>
              )}
              {user.gender && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={COLORS.gray[500]}
                  />
                  <Text style={styles.infoText}>
                    {user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : user.gender}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={COLORS.gray[500]}
                />
                <Text style={styles.infoText}>
                  Tham gia:{' '}
                  {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {user.isLocked ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.unlockBtn]}
                  onPress={handleUnlockUser}
                  disabled={actionLoading}
                >
                  <Ionicons
                    name="lock-open-outline"
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.actionBtnText}>Mở khóa tài khoản</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.lockBtn]}
                  onPress={() => setLockModalVisible(true)}
                  disabled={actionLoading}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.actionBtnText}>Khóa tài khoản</Text>
                </TouchableOpacity>
              )}
            </View>

            {user.isLocked && user.lockedReason && (
              <View style={styles.lockedReasonBox}>
                <Text style={styles.lockedReasonTitle}>Lý do khóa:</Text>
                <Text style={styles.lockedReasonText}>{user.lockedReason}</Text>
              </View>
            )}
          </View>

          {/* CVs Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CV đã tải lên</Text>
              <View style={styles.cvCount}>
                <Text style={styles.cvCountText}>{cvs.length}</Text>
              </View>
            </View>

            {cvs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-text-outline"
                  size={40}
                  color={COLORS.gray[300]}
                />
                <Text style={styles.emptyText}>Ứng viên chưa tải CV nào</Text>
              </View>
            ) : (
              cvs.map((cv) => (
                <TouchableOpacity
                  key={cv._id}
                  style={styles.cvCard}
                  onPress={() => handleViewCV(cv)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cvIcon}>
                    <Ionicons
                      name={
                        cv.url?.toLowerCase().endsWith('.pdf')
                          ? 'document-text'
                          : 'image'
                      }
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.cvInfo}>
                    <Text style={styles.cvTitle} numberOfLines={1}>
                      {cv.title || 'CV không tên'}
                    </Text>
                    <Text style={styles.cvDate}>
                      {format(new Date(cv.createdAt), 'dd/MM/yyyy HH:mm', {
                        locale: vi,
                      })}
                    </Text>
                  </View>
                  {cv.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>Chính</Text>
                    </View>
                  )}
                  <Ionicons
                    name="eye-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>

        {/* Lock Modal */}
        <Modal visible={lockModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Khóa tài khoản</Text>
              <Text style={styles.modalSubtitle}>
                Nhập lý do khóa tài khoản của ứng viên:
              </Text>

              <TextInput
                style={styles.reasonInput}
                placeholder="Lý do khóa (không bắt buộc)"
                value={lockReason}
                onChangeText={setLockReason}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.gray[400]}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => {
                    setLockModalVisible(false);
                    setLockReason('');
                  }}
                  disabled={actionLoading}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirmBtn]}
                  onPress={handleLockUser}
                  disabled={actionLoading}
                >
                  <Text style={styles.modalConfirmText}>
                    {actionLoading ? 'Đang xử lý...' : 'Khóa'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>

      {cvPreviewUrl && (
        <ImageViewing
          images={[{ uri: cvPreviewUrl }]}
          imageIndex={0}
          visible={cvPreviewVisible}
          onRequestClose={() => setCvPreviewVisible(false)}
          presentationStyle="fullScreen"
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLocked: {
    borderWidth: 2,
    borderColor: COLORS.danger,
    backgroundColor: '#fef2f2',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLocked: {
    backgroundColor: COLORS.danger,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  userEmail: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  lockedText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    paddingTop: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: SIZES.md,
    color: COLORS.gray[600],
  },
  actionButtons: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    gap: 8,
  },
  lockBtn: {
    backgroundColor: COLORS.danger,
  },
  unlockBtn: {
    backgroundColor: COLORS.success,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  lockedReasonBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  lockedReasonTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: 4,
  },
  lockedReasonText: {
    fontSize: SIZES.md,
    color: COLORS.gray[700],
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  cvCount: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cvCountText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: SIZES.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    marginTop: 12,
    fontSize: SIZES.md,
    color: COLORS.gray[400],
  },
  cvCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
    marginBottom: 10,
  },
  cvIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cvInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cvTitle: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.gray[800],
  },
  cvDate: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  primaryBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  primaryText: {
    color: COLORS.success,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: SIZES.md,
    color: COLORS.gray[600],
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: SIZES.radius,
    padding: 12,
    fontSize: SIZES.md,
    minHeight: 80,
    textAlignVertical: 'top',
    color: COLORS.gray[800],
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.gray[100],
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.danger,
  },
  modalCancelText: {
    color: COLORS.gray[600],
    fontWeight: '600',
  },
  modalConfirmText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default CandidateDetailScreen;
