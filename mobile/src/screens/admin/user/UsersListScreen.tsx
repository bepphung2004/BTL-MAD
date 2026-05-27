import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, SafeAreaView, TextInput, RefreshControl } from 'react-native';
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
  UsersList: undefined;
  UserForm: undefined;
  UserDetail: { userId: string };
};

const ROLE_COLORS = {
  ADMIN: { bg: '#fee2e2', text: '#dc2626' },
  HR: { bg: '#dbeafe', text: '#2563eb' },
  USER: { bg: '#dcfce7', text: '#16a34a' },
};

const UsersListScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AdminStackParamList>>();
  const [users, setUsers] = useState<IUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersService.getUsers();
      const data = res.data.result || [];
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách người dùng');
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

  // Filter users by search and role
  useEffect(() => {
    let filtered = users;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        u => u.name?.toLowerCase().includes(query) || 
             u.email?.toLowerCase().includes(query)
      );
    }
    
    if (roleFilter) {
      filtered = filtered.filter(u => u.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  const renderRoleFilters = () => (
    <View style={styles.filterRow}>
      {['All', 'ADMIN', 'HR', 'USER'].map((role) => (
        <TouchableOpacity
          key={role}
          style={[
            styles.filterChip,
            (role === 'All' ? !roleFilter : roleFilter === role) && styles.filterChipActive,
          ]}
          onPress={() => setRoleFilter(role === 'All' ? null : role)}
        >
          <Text style={[
            styles.filterChipText,
            (role === 'All' ? !roleFilter : roleFilter === role) && styles.filterChipTextActive,
          ]}>
            {role === 'All' ? 'Tất cả' : role}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: IUser }) => {
    const roleStyle = ROLE_COLORS[item.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.USER;
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('UserDetail', { userId: item._id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
            <Text style={[styles.roleText, { color: roleStyle.text }]}>{item.role}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.gray[500]} />
            <Text style={styles.metaText}>
              {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: vi })}
            </Text>
          </View>
          {item.address && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
              <Text style={styles.metaText} numberOfLines={1}>{item.address}</Text>
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
        <Text style={styles.headerTitle}>Quản lý người dùng</Text>
        <Text style={styles.headerSubtitle}>{filteredUsers.length} người dùng</Text>
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

      {/* Role Filters */}
      {renderRoleFilters()}

      {/* Content */}
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>Không có người dùng nào</Text>
            </View>
          }
        />
      )}

      {/* FAB Create User */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('UserForm')}
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
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  roleText: {
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

export default UsersListScreen;
