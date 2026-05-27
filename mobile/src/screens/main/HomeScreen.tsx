import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { JobCard, CompanyCard, Loading } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchTopJobs } from '../../store/slices/jobSlice';
import { fetchCompanies } from '../../store/slices/companySlice';
import { RootStackParamList, MainTabParamList } from '../../navigation/AppNavigator';
import { IJob, ICompany } from '../../types';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { topJobs, isLoading: jobsLoading } = useAppSelector((state) => state.jobs);
  const { companies, isLoading: companiesLoading } = useAppSelector((state) => state.companies);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchTopJobs(5)),
      dispatch(fetchCompanies({ current: 1, pageSize: 5 })),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderJobItem = ({ item }: { item: IJob }) => (
    <View style={styles.jobCardWrapper}>
      <JobCard
        job={item}
        onPress={() => navigation.navigate('JobDetail', { jobId: item._id })}
      />
    </View>
  );

  const renderCompanyItem = ({ item }: { item: ICompany }) => (
    <TouchableOpacity
      style={styles.companyItem}
      onPress={() => navigation.navigate('CompanyDetail', { companyId: item._id })}
    >
      <Image
        source={{ uri: item.logo || 'https://via.placeholder.com/60' }}
        style={styles.companyLogo}
      />
      <Text style={styles.companyName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.companyJobs}>{item.jobCount || 0} việc làm</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{user?.name || 'Người dùng'}</Text>
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => navigation.navigate('Jobs')}
          >
            <Ionicons name="search" size={24} color={COLORS.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('MyApplications' as any)}
          >
            <Ionicons name="document-text" size={28} color={COLORS.primary} />
            <Text style={styles.statLabel}>Hồ sơ đã nộp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('MyCVs' as any)}
          >
            <Ionicons name="folder" size={28} color={COLORS.success} />
            <Text style={styles.statLabel}>CV của tôi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Companies')}
          >
            <Ionicons name="heart" size={28} color={COLORS.danger} />
            <Text style={styles.statLabel}>Theo dõi</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Jobs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Việc làm nổi bật</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {jobsLoading ? (
            <Loading />
          ) : (
            <FlatList
              data={topJobs}
              renderItem={renderJobItem}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.jobsList}
            />
          )}
        </View>

        {/* Top Companies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Công ty hàng đầu</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Companies')}>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {companiesLoading ? (
            <Loading />
          ) : (
            <FlatList
              data={companies}
              renderItem={renderCompanyItem}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.companiesList}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    marginTop: 20,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  seeAll: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  jobsList: {
    paddingHorizontal: SIZES.padding,
  },
  jobCardWrapper: {
    width: 300,
    marginRight: 12,
  },
  companiesList: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 20,
  },
  companyItem: {
    width: 120,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  companyName: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray[800],
    textAlign: 'center',
    marginTop: 8,
  },
  companyJobs: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
  },
});

export default HomeScreen;
