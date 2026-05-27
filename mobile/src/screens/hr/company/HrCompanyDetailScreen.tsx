import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
  SafeAreaView,
  RefreshControl,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { companyService } from "../../../services/companyService";
import { Loading } from "../../../components/common/Loading";
import { COLORS } from "../../../constants";
import RenderHTML from "react-native-render-html";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { ICompany, ICompanyPendingHr } from "@/types";
import { NativeStackNavigationProp } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";
import { getProfile } from "../../../store/slices/authSlice";

type HrStackParamList = {
  HrCompanyUpdate: { company: ICompany };
};

interface IHrUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

const HrCompanyDetailScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const companyId = user?.company?._id;
  const [company, setCompany] = useState<ICompany | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList>>();

  // Pending HR requests states
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingHrs, setPendingHrs] = useState<ICompanyPendingHr[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [processingHr, setProcessingHr] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await companyService.getCompanyById(companyId);
      setCompany(res.data as ICompany);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải thông tin công ty");
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
    loadPendingHrs();
    checkIsCreator();
    const unsubscribe = navigation.addListener('focus', () => {
      load();
      loadPendingHrs();
      checkIsCreator();
    });
    return unsubscribe;
  }, [companyId, navigation]);

  // Check if current user is the company creator
  const checkIsCreator = async () => {
    if (!companyId) return;
    try {
      const res = await companyService.isCompanyCreator(companyId);
      setIsCreator(res.data === true);
    } catch {
      setIsCreator(false);
    }
  };

  // Remove HR from company
  const handleRemoveHr = (hr: IHrUser) => {
    if (!company) return;
    if (hr._id === user?._id) {
      Alert.alert('Lỗi', 'Bạn không thể xóa chính mình khỏi công ty');
      return;
    }
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ${hr.name} khỏi công ty?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await companyService.removeHrFromCompany(hr._id, company._id);
              Alert.alert('Thành công', `Đã xóa ${hr.name} khỏi công ty`);
              load();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xóa HR');
            }
          },
        },
      ]
    );
  };

  // Load pending HR requests
  const loadPendingHrs = async () => {
    if (!companyId) return;
    setPendingLoading(true);
    try {
      const res = await companyService.getPendingHrs(companyId);
      setPendingHrs(res.data || []);
    } catch (err) {
      console.error('Load pending HRs error:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  // Approve HR join request
  const handleApproveHr = (hr: ICompanyPendingHr) => {
    Alert.alert(
      'Xác nhận duyệt',
      `Bạn có chắc chắn muốn duyệt ${hr.name} vào công ty?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            setProcessingHr(hr.userId);
            try {
              await companyService.approveHrRequest(companyId!, hr.userId);
              Alert.alert('Thành công', `Đã duyệt ${hr.name} vào công ty`);
              loadPendingHrs();
              load();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể duyệt yêu cầu');
            } finally {
              setProcessingHr(null);
            }
          },
        },
      ],
    );
  };

  // Reject HR join request
  const handleRejectHr = (hr: ICompanyPendingHr) => {
    Alert.alert(
      'Từ chối yêu cầu',
      `Bạn có chắc chắn muốn từ chối ${hr.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            setProcessingHr(hr.userId);
            try {
              await companyService.rejectHrRequest(companyId!, hr.userId);
              Alert.alert('Đã từ chối', `Đã từ chối yêu cầu của ${hr.name}`);
              loadPendingHrs();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể từ chối yêu cầu');
            } finally {
              setProcessingHr(null);
            }
          },
        },
      ],
    );
  };

  const handleLeaveCompany = () => {
    Alert.alert(
      'Rời công ty',
      'Bạn có chắc chắn muốn rời khỏi công ty? Sau khi rời, bạn sẽ về trạng thái chưa thuộc công ty nào.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời công ty',
          style: 'destructive',
          onPress: async () => {
            try {
              await companyService.leaveCompany();
              Alert.alert('Thành công', 'Bạn đã rời khỏi công ty');
              dispatch(getProfile());
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể rời công ty');
            }
          },
        },
      ],
    );
  };

  if (loading && !company) return <Loading />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông tin công ty</Text>
        <Text style={styles.headerSubtitle}>Quản lý hồ sơ công ty của bạn</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {!company ? (
          <Loading />
        ) : (
          <>
            {/* Company Card */}
            <View style={styles.companyCard}>
              {/* Logo Section */}
              <View style={styles.logoSection}>
                {company.logo ? (
                  <Image
                    source={{ uri: company.logo }}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="business" size={48} color={COLORS.gray[400]} />
                  </View>
                )}
              </View>

              {/* Company Info */}
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                
                {/* Status Badge */}
                <View style={[
                  styles.statusBadge,
                  company.isActive ? styles.statusActive : styles.statusInactive
                ]}>
                  <Ionicons 
                    name={company.isActive ? "checkmark-circle" : "close-circle"} 
                    size={14} 
                    color={company.isActive ? COLORS.success : COLORS.danger} 
                  />
                  <Text style={[
                    styles.statusText,
                    { color: company.isActive ? COLORS.success : COLORS.danger }
                  ]}>
                    {company.isActive ? "Đã kích hoạt" : "Chưa kích hoạt"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Address Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                <Text style={styles.infoCardTitle}>Địa chỉ</Text>
              </View>
              <Text style={styles.infoCardContent}>
                {company.address || "Chưa cập nhật địa chỉ"}
              </Text>
            </View>

            {/* Description Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
                <Text style={styles.infoCardTitle}>Mô tả công ty</Text>
              </View>
              {company.description ? (
                <View style={styles.descriptionContainer}>
                  <RenderHTML
                    contentWidth={width - 64}
                    source={{ html: company.description }}
                    tagsStyles={{
                      p: { color: COLORS.gray[700], fontSize: 14, lineHeight: 22 },
                      li: { color: COLORS.gray[700], fontSize: 14 },
                    }}
                  />
                </View>
              ) : (
                <Text style={styles.emptyText}>Chưa có mô tả công ty</Text>
              )}
            </View>

            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="people-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.statValue}>{(company as any).usersFollow?.length || 0}</Text>
                <Text style={styles.statLabel}>Người theo dõi</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="briefcase-outline" size={24} color={COLORS.success} />
                </View>
                <Text style={styles.statValue}>{company.jobCount}</Text>
                <Text style={styles.statLabel}>Việc đang tuyển</Text>
              </View>
            </View>

            {/* Update Button */}
            <TouchableOpacity
              style={styles.updateButton}
              onPress={() => navigation.navigate("HrCompanyUpdate", { company })}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.white} />
              <Text style={styles.updateButtonText}>Cập nhật thông tin công ty</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>

            {/* HR Management Section */}
            <View style={styles.hrSection}>
              <View style={styles.hrSectionHeader}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                  <Text style={styles.infoCardTitle}>
                    HR trong công ty ({(company as any).hrs?.length || 0})
                  </Text>
                </View>
              </View>

              {(company as any).hrs && (company as any).hrs.length > 0 ? (
                (company as any).hrs.map((hr: IHrUser) => (
                  <View key={hr._id} style={styles.hrItem}>
                    <View style={styles.hrAvatarContainer}>
                      {hr.avatar ? (
                        <Image source={{ uri: hr.avatar }} style={styles.hrAvatar} />
                      ) : (
                        <View style={styles.hrAvatarPlaceholder}>
                          <Text style={styles.hrAvatarText}>
                            {hr.name?.charAt(0).toUpperCase() || 'H'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.hrInfo}>
                      <Text style={styles.hrName}>{hr.name}</Text>
                      <Text style={styles.hrEmail}>{hr.email}</Text>
                      {hr._id === user?._id && (
                        <Text style={styles.hrYouBadge}>Bạn</Text>
                      )}
                    </View>
                    {isCreator && hr._id !== user?._id && (
                      <TouchableOpacity
                        style={styles.removeHrButton}
                        onPress={() => handleRemoveHr(hr)}
                      >
                        <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Chưa có HR nào trong công ty</Text>
              )}
            </View>

            {/* Pending HR Requests Section */}
            <View style={styles.hrSection}>
              <TouchableOpacity
                style={styles.hrSectionHeader}
                activeOpacity={0.7}
                onPress={() => {
                  setShowPendingModal(true);
                  loadPendingHrs();
                }}
              >
                <View style={styles.infoCardHeader}>
                  <Ionicons name="hourglass-outline" size={20} color={COLORS.warning || '#f59e0b'} />
                  <Text style={styles.infoCardTitle}>
                    Yêu cầu tham gia ({pendingHrs.length})
                  </Text>
                </View>
                <View style={[styles.addHrButton, { backgroundColor: COLORS.warning || '#f59e0b' }]}>
                  <Ionicons name="eye" size={18} color={COLORS.white} />
                  <Text style={styles.addHrButtonText}>Xem</Text>
                </View>
              </TouchableOpacity>

              {pendingHrs.length > 0 ? (
                <View style={styles.pendingPreview}>
                  {pendingHrs.slice(0, 3).map((hr) => (
                    <View key={hr.userId} style={styles.pendingPreviewItem}>
                      <View style={styles.hrAvatarContainer}>
                        {hr.avatar ? (
                          <Image source={{ uri: hr.avatar }} style={styles.hrAvatar} />
                        ) : (
                          <View style={[styles.hrAvatarPlaceholder, { backgroundColor: COLORS.warning || '#f59e0b' }]}>
                            <Text style={styles.hrAvatarText}>
                              {hr.name?.charAt(0).toUpperCase() || 'H'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.hrInfo}>
                        <Text style={styles.hrName}>{hr.name}</Text>
                        <Text style={styles.hrEmail}>{hr.email}</Text>
                      </View>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Chờ duyệt</Text>
                      </View>
                    </View>
                  ))}
                  {pendingHrs.length > 3 && (
                    <Text style={styles.pendingMoreText}>
                      +{pendingHrs.length - 3} yêu cầu khác
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.emptyText}>Không có yêu cầu tham gia nào</Text>
              )}
            </View>

            {/* Help Card */}
            <View style={styles.helpCard}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
              <Text style={styles.helpText}>
                Cập nhật thông tin công ty đầy đủ và hấp dẫn sẽ giúp thu hút nhiều ứng viên tiềm năng hơn.
              </Text>
            </View>

            {/* Leave Company Button (non-creator only) */}
            {!isCreator && (
              <TouchableOpacity
                style={styles.leaveCompanyButton}
                onPress={handleLeaveCompany}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
                <Text style={styles.leaveCompanyButtonText}>Rời công ty</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Pending HR Requests Modal */}
      <Modal
        visible={showPendingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPendingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yêu cầu tham gia công ty</Text>
              <TouchableOpacity onPress={() => setShowPendingModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            {pendingLoading ? (
              <View style={styles.pendingLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.pendingLoadingText}>Đang tải...</Text>
              </View>
            ) : (
              <FlatList
                data={pendingHrs}
                keyExtractor={(item) => item.userId}
                renderItem={({ item }) => (
                  <View style={styles.pendingHrItem}>
                    <View style={styles.pendingHrTop}>
                      <View style={styles.hrAvatarContainer}>
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.hrAvatar} />
                        ) : (
                          <View style={[styles.hrAvatarPlaceholder, { backgroundColor: COLORS.warning || '#f59e0b' }]}>
                            <Text style={styles.hrAvatarText}>
                              {item.name?.charAt(0).toUpperCase() || 'H'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.hrInfo}>
                        <Text style={styles.hrName}>{item.name}</Text>
                        <Text style={styles.hrEmail}>{item.email}</Text>
                        <Text style={styles.pendingDate}>
                          Yêu cầu lúc: {new Date(item.requestedAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                    </View>
                    {isCreator ? (
                      <View style={styles.pendingActions}>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleRejectHr(item)}
                          disabled={processingHr === item.userId}
                        >
                          {processingHr === item.userId ? (
                            <ActivityIndicator size="small" color={COLORS.danger} />
                          ) : (
                            <>
                              <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                              <Text style={styles.rejectButtonText}>Từ chối</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => handleApproveHr(item)}
                          disabled={processingHr === item.userId}
                        >
                          {processingHr === item.userId ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                              <Text style={styles.approveButtonText}>Duyệt</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.pendingViewOnly}>
                        <Ionicons name="eye-outline" size={16} color={COLORS.gray[500]} />
                        <Text style={styles.pendingViewOnlyText}>Chỉ người tạo công ty mới có quyền duyệt</Text>
                      </View>
                    )}
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptySearchContainer}>
                    <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={styles.emptySearchText}>Không có yêu cầu nào</Text>
                    <Text style={styles.emptySearchHint}>Tất cả yêu cầu tham gia đã được xử lý</Text>
                  </View>
                }
                style={styles.searchResultsList}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  companyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignItems: 'center',
  },
  logoSection: {
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.gray[100],
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInfo: {
    alignItems: 'center',
  },
  companyName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gray[800],
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  statusActive: {
    backgroundColor: COLORS.success + '15',
  },
  statusInactive: {
    backgroundColor: COLORS.danger + '15',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  infoCardContent: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 22,
  },
  descriptionContainer: {
    marginTop: -8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray[400],
    fontStyle: 'italic',
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.gray[200],
    marginHorizontal: 16,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 8,
  },
  updateButtonText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 20,
  },
  // HR Management Styles
  hrSection: {
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
  hrSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addHrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addHrButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  hrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  hrAvatarContainer: {
    marginRight: 12,
  },
  hrAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
  },
  hrAvatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hrAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  hrInfo: {
    flex: 1,
  },
  hrName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  hrEmail: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  hrYouBadge: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  removeHrButton: {
    padding: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  searchResultsList: {
    paddingHorizontal: 16,
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: 12,
  },
  emptySearchHint: {
    fontSize: 13,
    color: COLORS.gray[400],
    marginTop: 4,
  },
  // Pending HR Styles
  pendingPreview: {
    marginTop: 4,
  },
  pendingPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  pendingMoreText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 12,
  },
  pendingLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  pendingLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray[500],
  },
  pendingHrItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  pendingHrTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingDate: {
    fontSize: 12,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
    paddingLeft: 57,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  pendingViewOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 57,
    gap: 6,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
  },
  pendingViewOnlyText: {
    fontSize: 13,
    color: COLORS.gray[500],
    fontStyle: 'italic',
    flex: 1,
  },
  leaveCompanyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    gap: 8,
  },
  leaveCompanyButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default HrCompanyDetailScreen;
