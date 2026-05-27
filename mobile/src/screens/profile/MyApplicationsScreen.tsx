import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, APPLICATION_STATUS } from '../../constants';
import { ApplicationCard, Loading, EmptyState } from '../../components';
import { applicationService } from '../../services/applicationService';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { IApplication } from '../../types';

type MyApplicationsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyApplications'>;
};

type FilterType = 'all' | 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED';

const MyApplicationsScreen: React.FC<MyApplicationsScreenProps> = ({ navigation }) => {
  const [applications, setApplications] = useState<IApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await applicationService.getMyApplications();
      setApplications(response.data || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const filteredApplications = applications.filter(
    (app) => filter === 'all' || app.status === filter
  );

  const getFilterCount = (status: FilterType) => {
    if (status === 'all') return applications.length;
    return applications.filter((app) => app.status === status).length;
  };

  const filters: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: 'Tất cả', color: COLORS.gray[600] },
    { key: 'PENDING', label: 'Đang chờ', color: COLORS.warning },
    { key: 'REVIEWING', label: 'Xem xét', color: COLORS.info },
    { key: 'APPROVED', label: 'Đã duyệt', color: COLORS.success },
    { key: 'REJECTED', label: 'Từ chối', color: COLORS.danger },
  ];

  const renderApplicationItem = useCallback(
    ({ item }: { item: IApplication }) => (
      <ApplicationCard
        application={item}
        onPress={() => navigation.navigate('ApplicationDetail', { applicationId: item._id })}
      />
    ),
    [navigation]
  );

  if (loading) {
    return <Loading fullScreen text="Đang tải hồ sơ..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === item.key && { backgroundColor: item.color + '20', borderColor: item.color },
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item.key && { color: item.color, fontWeight: '600' },
                ]}
              >
                {item.label} ({getFilterCount(item.key)})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Không có hồ sơ nào"
          message={
            filter === 'all'
              ? 'Bạn chưa ứng tuyển việc làm nào'
              : 'Không có hồ sơ nào với trạng thái này'
          }
          actionLabel="Tìm việc làm"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <FlatList
          data={filteredApplications}
          renderItem={renderApplicationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  filterList: {
    paddingHorizontal: SIZES.padding,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginRight: 8,
  },
  filterText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
  },
  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
  },
});

export default MyApplicationsScreen;
