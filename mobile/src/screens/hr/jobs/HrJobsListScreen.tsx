import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, SafeAreaView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../../store/hooks';
import { jobService } from '../../../services/jobService';
import { Loading } from '../../../components/common/Loading';
import { COLORS, SIZES } from '../../../constants';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from 'node_modules/@react-navigation/native-stack/lib/typescript/src/types';

type HrStackParamList = {
    HrJobForm: { job?: any };
    HrJobDetail: { job: any };
};

const HrJobsListScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const company = user?.company;
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inactiveMessage, setInactiveMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList, 'HrJobForm'>>();

  const load = useCallback(async (searchName?: string) => {
    if (!company) return;
    setInactiveMessage(null);
    if (!searchName) {
      setLoading(true);
    }
    try {
      let res;
      if (searchName && searchName.trim()) {
        res = await jobService.searchJobsByHr(searchName.trim(), { pageSize: 50, current: 1 });
      } else {
        res = await jobService.getJobsByHr({ pageSize: 50, current: 1 });
      }
      setJobs(res.data.result || []);
      setInactiveMessage(null);
    } catch (err: any) {
      let msg = 'Có lỗi xảy ra';
      if (err?.response?.data?.message) msg = err.response.data.message;
      else if (err?.message) msg = err.message;

      if (msg === 'Company is not active' || msg.toLowerCase().includes('not active')) {
        setInactiveMessage('Công ty của bạn chưa được duyệt, vui lòng liên hệ admin');
      } else {
        setInactiveMessage(msg);
      }
      setJobs([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [company]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(searchQuery);
    setRefreshing(false);
  };

  const handleSearch = () => {
    setIsSearching(true);
    load(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    load();
  };

  const getJobStats = () => {
    const activeJobs = jobs.filter(j => j.isActive).length;
    const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicationsCount || 0), 0);
    return { total: jobs.length, active: activeJobs, applicants: totalApplicants };
  };

  const stats = getJobStats();

  if (!company) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: COLORS.gray[50],
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Ionicons name="business-outline" size={40} color={COLORS.gray[300]} />
          </View>
          <Text style={[styles.errorText, { fontSize: 18, fontWeight: '700', color: COLORS.gray[700] }]}>
            Bạn chưa tham gia công ty nào
          </Text>
          <Text style={[styles.errorText, { fontSize: 14, color: COLORS.gray[400], marginTop: 8 }]}>
            Hãy tạo hoặc tham gia công ty trong tab "Công ty" để bắt đầu đăng tin tuyển dụng
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (inactiveMessage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>{inactiveMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && jobs.length === 0) return <Loading />;

  const renderItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('HrJobDetail' as any, { job: item })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          <View style={[
            styles.statusBadge,
            item.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: item.isActive ? '#22c55e' : '#ef4444' }
            ]} />
            <Text style={[
              styles.statusBadgeText,
              { color: item.isActive ? '#22c55e' : '#ef4444' }
            ]}>
              {item.isActive ? 'Đang tuyển' : 'Ngưng tuyển'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.infoText}>{item.location || 'Chưa cập nhật'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.infoText}>
            {item.salary ? `${item.salary.toLocaleString()} ₫` : 'Thương lượng'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.infoText}>
            {item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '-'} 
            {' → '}
            {item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : '-'}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.applicantsContainer}>
          <Ionicons name="people" size={18} color={COLORS.primary} />
          <Text style={styles.applicantsCount}>{item.applicationsCount ?? 0}</Text>
          <Text style={styles.applicantsLabel}>ứng viên</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý việc làm</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng số</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Đang tuyển</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.applicants}</Text>
            <Text style={styles.statLabel}>Ứng viên</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm việc làm theo tên..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Tìm</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={48} color={COLORS.gray[300]} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Không tìm thấy việc làm' : 'Chưa có tin tuyển dụng'}
            </Text>
            <Text style={styles.emptyHint}>
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn nút + để tạo tin mới'}
            </Text>
          </View>
        }
      />

      {/* FAB Create Job */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('HrJobForm' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.gray[200],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeInactive: {
    backgroundColor: '#fee2e2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  applicantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicantsCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  applicantsLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.gray[400],
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

export default HrJobsListScreen;
