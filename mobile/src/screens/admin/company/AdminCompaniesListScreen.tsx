import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, SafeAreaView, RefreshControl, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { companyService } from '../../../services/companyService';
import { ICompany } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS, SIZES } from '../../../constants';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type AdminStackParamList = {
  ManageCompany: undefined;
  AdminCompanyDetail: { companyId: string };
};

const AdminCompaniesListScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AdminStackParamList>>();
  const [companies, setCompanies] = useState<ICompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  const load = async (params: any = {}) => {
    setLoading(true);
    try {
      const query: any = { pageSize: 100 };
      if (params.statusFilter === 'active') query.isActive = true;
      if (params.statusFilter === 'inactive') query.isActive = false;
      if (params.search) query.name = params.search;
      const res = await companyService.getAllCompaniesByAdmin(query);
      setCompanies(res.data.result || []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách công ty');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load({ statusFilter, search });
    setRefreshing(false);
  };

  useEffect(() => {
    load({ statusFilter, search });
    const unsubscribe = navigation.addListener('focus', () => load({ statusFilter, search }));
    return unsubscribe;
  }, [navigation, statusFilter, search]);

  const getStatusCounts = () => {
    const active = companies.filter(c => c.isActive).length;
    const inactive = companies.filter(c => !c.isActive).length;
    return { all: companies.length, active, inactive };
  };

  const counts = getStatusCounts();

  const renderItem = ({ item }: { item: ICompany }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('AdminCompanyDetail', { companyId: item._id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.companyLogo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="business" size={24} color={COLORS.primary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.companyName} numberOfLines={1}>{item.name}</Text>
          {item.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
              <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#22c55e' : '#ef4444' }]} />
          <Text style={[styles.statusText, { color: item.isActive ? '#22c55e' : '#ef4444' }]}>
            {item.isActive ? 'Đã duyệt' : 'Chờ duyệt'}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.metaText}>
            {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: vi })}
          </Text>
        </View>
        {item.jobCount !== undefined && (
          <View style={styles.metaItem}>
            <Ionicons name="briefcase-outline" size={14} color={COLORS.gray[500]} />
            <Text style={styles.metaText}>{item.jobCount} việc làm</Text>
          </View>
        )}
        {item.followers && (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.gray[500]} />
            <Text style={styles.metaText}>{item.followers.length} theo dõi</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardArrow}>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý công ty</Text>
        <Text style={styles.headerSubtitle}>
          {counts.all} công ty • {counts.active} đã duyệt • {counts.inactive} chờ duyệt
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm công ty..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.gray[400]}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
            Tất cả ({counts.all})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActiveGreen]}
          onPress={() => setStatusFilter('active')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'active' && styles.filterChipTextActiveGreen]}>
            Đã duyệt ({counts.active})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'inactive' && styles.filterChipActiveRed]}
          onPress={() => setStatusFilter('inactive')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'inactive' && styles.filterChipTextActiveRed]}>
            Chờ duyệt ({counts.inactive})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={companies}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>Không có công ty nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipActiveGreen: {
    backgroundColor: '#dcfce7',
  },
  filterChipActiveRed: {
    backgroundColor: '#fee2e2',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  filterChipTextActiveGreen: {
    color: '#16a34a',
  },
  filterChipTextActiveRed: {
    color: '#dc2626',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.gray[500],
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray[400],
    marginTop: 12,
  },
});

export default AdminCompaniesListScreen;
