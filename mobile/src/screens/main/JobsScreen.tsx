import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { JobCard, Loading, EmptyState, Button } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchJobs } from '../../store/slices/jobSlice';
import { RootStackParamList, MainTabParamList } from '../../navigation/AppNavigator';
import { IJob } from '../../types';
import { skillService } from '../../services/skillService';

type JobsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Jobs'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type JobsScreenProps = {
  navigation: JobsScreenNavigationProp;
};

interface Filters {
  location: string;
  level: string;
  salary: string;
  skills: string[];
}

const JobsScreen: React.FC<JobsScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { jobs, isLoading, meta: pagination } = useAppSelector((state) => state.jobs);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    location: '',
    level: '',
    salary: '',
    skills: [],
  });
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const locations = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Remote'];
  const levels = ['INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEADER', 'MANAGER'];
  const salaryRanges = [
    { label: 'Dưới 10 triệu', value: 'lt-10000000' },
    { label: '10-20 triệu', value: '10000000-20000000' },
    { label: '20-50 triệu', value: '20000000-50000000' },
    { label: 'Trên 50 triệu', value: 'gt-50000000' },
  ];

  useEffect(() => {
    loadJobs();
    loadSkills();
  }, []);

  const loadJobs = async (pageNum = 1, search = '') => {
    const query: any = { current: pageNum, pageSize: 10 };
    
    // Pass raw values - jobService will handle formatting
    if (search) query.name = search;
    if (filters.location) query.location = filters.location;
    if (filters.level) query.level = filters.level;
    
    // Skills filter - pass skill names array
    if (filters.skills.length > 0) {
      query.skills = filters.skills;
    }
    
    // Salary filter - range queries
    if (filters.salary) {
      if (filters.salary.startsWith('lt-')) {
        // Less than
        const maxSalary = parseInt(filters.salary.replace('lt-', ''));
        query.salary = { $lt: maxSalary };
      } else if (filters.salary.startsWith('gt-')) {
        // Greater than
        const minSalary = parseInt(filters.salary.replace('gt-', ''));
        query.salary = { $gte: minSalary };
      } else if (filters.salary.includes('-')) {
        // Range: min-max
        const [min, max] = filters.salary.split('-').map(Number);
        query.salary = { $gte: min, $lte: max };
      }
    }

    await dispatch(fetchJobs(query));
    setPage(pageNum);
  };

  const loadSkills = async () => {
    try {
      const response = await skillService.getSkills();
      // Normalize possible response shapes from the API/service. Common shapes:
      // 1) Array directly: [skill, ...]
      // 2) { data: [skill, ...] }
      // 3) { result: [skill, ...] }
      // 4) { statusCode: 200, data: { result: [skill, ...], meta: {...} } }
      let payload: any = response;
      if (payload && payload.data) payload = payload.data;
      if (payload && payload.data) payload = payload.data; // handle double-wrapped

      let skillsArray: any[] = [];
      if (Array.isArray(payload)) skillsArray = payload;
      else if (Array.isArray(payload.result)) skillsArray = payload.result;
      else if (Array.isArray(payload.data)) skillsArray = payload.data;
      else {
        console.warn('Unexpected skills response shape:', response);
        skillsArray = [];
      }

      setAvailableSkills(skillsArray);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs(1, searchQuery);
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadJobs(1, searchQuery);
  };

  const handleLoadMore = () => {
    if (pagination && page < pagination.pages && !isLoading) {
      loadJobs(page + 1, searchQuery);
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadJobs(1, searchQuery);
  };

  const clearFilters = () => {
    setFilters({ location: '', level: '', salary: '', skills: [] });
  };

  const toggleSkill = (skillName: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillName)
        ? prev.skills.filter((s) => s !== skillName)
        : [...prev.skills, skillName],
    }));
  };

  const renderJobItem = useCallback(
    ({ item }: { item: IJob }) => (
      <JobCard
        job={item}
        onPress={() => navigation.navigate('JobDetail', { jobId: item._id })}
      />
    ),
    [navigation]
  );

  const renderFooter = () => {
    if (!isLoading) return null;
    return <Loading />;
  };

  const activeFiltersCount =
    (filters.location ? 1 : 0) +
    (filters.level ? 1 : 0) +
    (filters.salary ? 1 : 0) +
    filters.skills.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm việc làm..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={activeFiltersCount > 0 ? COLORS.white : COLORS.gray[600]}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>{pagination?.total || 0} việc làm được tìm thấy</Text>
      </View>

      {/* Jobs List */}
      {isLoading && jobs.length === 0 ? (
        <Loading fullScreen text="Đang tải việc làm..." />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="Không tìm thấy việc làm"
          message="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
          actionLabel="Xóa bộ lọc"
          onAction={clearFilters}
        />
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={28} color={COLORS.gray[700]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Bộ lọc</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>Xóa</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Location Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Địa điểm</Text>
              <View style={styles.filterOptions}>
                {locations.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[
                      styles.filterChip,
                      filters.location === loc && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        location: prev.location === loc ? '' : loc,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.location === loc && styles.filterChipTextActive,
                      ]}
                    >
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Level Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Cấp bậc</Text>
              <View style={styles.filterOptions}>
                {levels.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.filterChip,
                      filters.level === level && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        level: prev.level === level ? '' : level,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.level === level && styles.filterChipTextActive,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Salary Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Mức lương</Text>
              <View style={styles.filterOptions}>
                {salaryRanges.map((range) => (
                  <TouchableOpacity
                    key={range.value}
                    style={[
                      styles.filterChip,
                      filters.salary === range.value && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        salary: prev.salary === range.value ? '' : range.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.salary === range.value && styles.filterChipTextActive,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Skills Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Kỹ năng</Text>
              <View style={styles.filterOptions}>
                {availableSkills.map((skill) => (
                  <TouchableOpacity
                    key={skill._id}
                    style={[
                      styles.filterChip,
                      filters.skills.includes(skill.name) && styles.filterChipActive,
                    ]}
                    onPress={() => toggleSkill(skill.name)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.skills.includes(skill.name) && styles.filterChipTextActive,
                      ]}
                    >
                      {skill.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button title="Áp dụng bộ lọc" onPress={applyFilters} />
          </View>
        </SafeAreaView>
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
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: SIZES.md,
    color: COLORS.gray[800],
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
  },
  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  clearText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  filterSection: {
    marginTop: 20,
  },
  filterLabel: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  modalFooter: {
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
});

export default JobsScreen;
