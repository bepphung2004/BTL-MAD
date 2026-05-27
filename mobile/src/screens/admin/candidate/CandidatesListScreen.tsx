import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { usersService } from '../../../services/usersService';
import { IUser } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS, SIZES } from '../../../constants';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type AdminStackParamList = {
  CandidatesList: undefined;
  CandidateDetail: { userId: string };
};

const CandidatesListScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AdminStackParamList>>();
  const [candidates, setCandidates] = useState<IUser[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersService.getCandidates();
      const data = res.data.result || [];
      setCandidates(data);
      setFilteredCandidates(data);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách ứng viên');
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
  }, [navigation]);

  // Filter candidates by search and status
  useEffect(() => {
    let filtered = candidates;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter === 'locked') {
      filtered = filtered.filter((u) => u.isLocked);
    } else if (statusFilter === 'active') {
      filtered = filtered.filter((u) => !u.isLocked);
    }

    setFilteredCandidates(filtered);
  }, [searchQuery, statusFilter, candidates]);

  const renderStatusFilters = () => (
    <View style={styles.filterRow}>
      {[
        { key: null, label: 'Tất cả' },
        { key: 'active', label: 'Hoạt động' },
        { key: 'locked', label: 'Bị khóa' },
      ].map((item) => (
        <TouchableOpacity
          key={item.key || 'all'}
          style={[
            styles.filterChip,
            statusFilter === item.key && styles.filterChipActive,
          ]}
          onPress={() => setStatusFilter(item.key)}
        >
          <Text
            style={[
              styles.filterChipText,
              statusFilter === item.key && styles.filterChipTextActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: IUser }) => {
    const isLocked = item.isLocked;

    return (
      <TouchableOpacity
        style={[styles.card, isLocked && styles.cardLocked]}
        onPress={() =>
          navigation.navigate('CandidateDetail', { userId: item._id })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.avatarContainer,
              isLocked && styles.avatarContainerLocked,
            ]}
          >
            <Text style={styles.avatarText}>
              {item.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.name}
              </Text>
              {isLocked && (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={12} color={COLORS.white} />
                  <Text style={styles.lockedText}>Đã khóa</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.gray[500]}
            />
            <Text style={styles.metaText}>
              {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: vi })}
            </Text>
          </View>
          {item.address && (
            <View style={styles.metaItem}>
              <Ionicons
                name="location-outline"
                size={14}
                color={COLORS.gray[500]}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardArrow}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý ứng viên</Text>
        <Text style={styles.headerSubtitle}>
          {filteredCandidates.length} ứng viên
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên, email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray[400]}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filters */}
      {renderStatusFilters()}

      {/* Content */}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={filteredCandidates}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={48}
                color={COLORS.gray[300]}
              />
              <Text style={styles.emptyText}>Không có ứng viên nào</Text>
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
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.margin,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: SIZES.md,
    color: COLORS.gray[800],
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  cardLocked: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainerLocked: {
    backgroundColor: COLORS.danger,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
    flex: 1,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lockedText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    maxWidth: 150,
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: SIZES.md,
    color: COLORS.gray[400],
  },
});

export default CandidatesListScreen;
