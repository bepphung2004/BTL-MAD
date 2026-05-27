import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersService } from '../../../services/usersService';
import { IUser } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';

const AdminPendingHrsScreen: React.FC = () => {
  const [pendingHrs, setPendingHrs] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedHr, setSelectedHr] = useState<IUser | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersService.getPendingHrs();
      setPendingHrs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách HR chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const handleApprove = (hr: IUser) => {
    Alert.alert(
      'Xác nhận duyệt',
      `Bạn có chắc chắn muốn duyệt tài khoản HR "${hr.name}" (${hr.email})?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            setApprovingId(hr._id);
            try {
              await usersService.approveHr(hr._id);
              Alert.alert('Thành công', `Đã duyệt tài khoản HR "${hr.name}"`);
              load();
            } catch (err: any) {
              Alert.alert(
                'Lỗi',
                err.response?.data?.message || 'Không thể duyệt tài khoản',
              );
            } finally {
              setApprovingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: IUser }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => setSelectedHr(item)}
    >
      <View style={styles.cardTop}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.name?.charAt(0).toUpperCase() || 'H'}
              </Text>
            </View>
          )}
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>HR</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={14} color={COLORS.gray[400]} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          {item.address ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray[400]} />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.gray[400]} />
            <Text style={styles.infoText}>
              Đăng ký lúc:{' '}
              {item.createdAt
                ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Status & Action */}
      <View style={styles.cardBottom}>
        <View style={styles.pendingStatusBadge}>
          <Ionicons name="hourglass-outline" size={14} color="#d97706" />
          <Text style={styles.pendingStatusText}>Chờ duyệt</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.approveButton,
            approvingId === item._id && styles.approveButtonDisabled,
          ]}
          onPress={() => handleApprove(item)}
          disabled={approvingId === item._id}
          activeOpacity={0.7}
        >
          {approvingId === item._id ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
              <Text style={styles.approveButtonText}>Duyệt</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && pendingHrs.length === 0) return <Loading />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Duyệt tài khoản HR</Text>
          <Text style={styles.headerSubtitle}>
            {pendingHrs.length > 0
              ? `${pendingHrs.length} tài khoản đang chờ duyệt`
              : 'Không có tài khoản nào chờ duyệt'}
          </Text>
        </View>
      </View>

      <FlatList
        data={pendingHrs}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-done-circle-outline" size={56} color={COLORS.success} />
              </View>
              <Text style={styles.emptyTitle}>Tất cả đã được duyệt!</Text>
              <Text style={styles.emptySubtitle}>
                Không có tài khoản HR nào đang chờ duyệt. Khi có HR mới đăng ký, bạn sẽ thấy
                tại đây.
              </Text>
            </View>
          ) : null
        }
      />

      {/* HR Detail Modal */}
      <Modal
        visible={!!selectedHr}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedHr(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết HR</Text>
              <TouchableOpacity onPress={() => setSelectedHr(null)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            {selectedHr && (
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {/* Profile Section */}
                <View style={styles.detailProfileSection}>
                  <View style={styles.detailAvatarContainer}>
                    {selectedHr.avatar ? (
                      <Image source={{ uri: selectedHr.avatar }} style={styles.detailAvatar} />
                    ) : (
                      <View style={styles.detailAvatarPlaceholder}>
                        <Text style={styles.detailAvatarText}>
                          {selectedHr.name?.charAt(0).toUpperCase() || 'H'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRoleBadge}>
                      <Text style={styles.detailRoleBadgeText}>HR</Text>
                    </View>
                  </View>
                  <Text style={styles.detailName}>{selectedHr.name}</Text>
                  <View style={styles.detailStatusBadge}>
                    <Ionicons name="hourglass-outline" size={14} color="#d97706" />
                    <Text style={styles.detailStatusText}>Chờ duyệt</Text>
                  </View>
                </View>

                {/* Personal Info Section */}
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.detailSectionTitle}>Thông tin cá nhân</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedHr.email}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Giới tính</Text>
                    <Text style={styles.detailValue}>
                      {selectedHr.gender === 'male' ? 'Nam' : selectedHr.gender === 'female' ? 'Nữ' : selectedHr.gender || 'Chưa cập nhật'}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Tuổi</Text>
                    <Text style={styles.detailValue}>
                      {selectedHr.age || 'Chưa cập nhật'}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Địa chỉ</Text>
                    <Text style={styles.detailValue}>
                      {selectedHr.address || 'Chưa cập nhật'}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Ngày đăng ký</Text>
                    <Text style={styles.detailValue}>
                      {selectedHr.createdAt
                        ? format(new Date(selectedHr.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                        : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Company Registration Info */}
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="business-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.detailSectionTitle}>Thông tin công ty đăng ký</Text>
                  </View>

                  {selectedHr.registrationCompany &&
                  (selectedHr.registrationCompany.name ||
                    selectedHr.registrationCompany.taxCode ||
                    selectedHr.registrationCompany.scale) ? (
                    <>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Tên công ty</Text>
                        <Text style={styles.detailValue}>
                          {selectedHr.registrationCompany.name || 'Không có'}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Mã số thuế</Text>
                        <Text style={styles.detailValue}>
                          {selectedHr.registrationCompany.taxCode || 'Không có'}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Quy mô</Text>
                        <Text style={styles.detailValue}>
                          {selectedHr.registrationCompany.scale || 'Không có'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.noCompanyInfo}>
                      <Ionicons name="information-circle-outline" size={20} color={COLORS.gray[400]} />
                      <Text style={styles.noCompanyInfoText}>
                        HR chưa cung cấp thông tin công ty khi đăng ký
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[
                      styles.detailApproveButton,
                      approvingId === selectedHr._id && styles.approveButtonDisabled,
                    ]}
                    onPress={() => {
                      setSelectedHr(null);
                      setTimeout(() => handleApprove(selectedHr), 300);
                    }}
                    disabled={approvingId === selectedHr._id}
                    activeOpacity={0.7}
                  >
                    {approvingId === selectedHr._id ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                        <Text style={styles.detailApproveText}>Duyệt tài khoản này</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  avatarContainer: {
    marginRight: 14,
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  roleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.gray[500],
    flex: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    paddingTop: 12,
  },
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  pendingStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d97706',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
  },
  approveButtonDisabled: {
    opacity: 0.6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray[400],
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  // Detail profile
  detailProfileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  detailAvatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  detailAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  detailRoleBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  detailRoleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  detailStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d97706',
  },
  // Detail sections
  detailSection: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[800],
    maxWidth: '60%',
    textAlign: 'right',
  },
  noCompanyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  noCompanyInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray[500],
    lineHeight: 18,
  },
  // Detail actions
  detailActions: {
    paddingVertical: 20,
  },
  detailApproveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailApproveText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default AdminPendingHrsScreen;
