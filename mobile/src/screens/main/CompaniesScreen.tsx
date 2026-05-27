import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { CompanyCard, Loading, EmptyState } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCompanies, followCompany, unfollowCompany } from '../../store/slices/companySlice';
import { RootStackParamList, MainTabParamList } from '../../navigation/AppNavigator';
import { ICompany } from '../../types';

type CompaniesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Companies'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type CompaniesScreenProps = {
  navigation: CompaniesScreenNavigationProp;
};

const CompaniesScreen: React.FC<CompaniesScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { companies, isLoading, pagination } = useAppSelector(
    (state) => state.companies
  );
  const { user } = useAppSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async (pageNum = 1, search = '') => {
    const query: any = { current: pageNum, pageSize: 10 };
    if (search) query.name = search;
    if (user?._id) query.userId = user._id;

    await dispatch(fetchCompanies(query));
    setPage(pageNum);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompanies(1, searchQuery);
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadCompanies(1, searchQuery);
  };

  const handleLoadMore = () => {
    if (page < pagination.pages && !isLoading) {
      loadCompanies(page + 1, searchQuery);
    }
  };

  const handleFollow = async (company: ICompany) => {
    if (company.isFollowed) {
      await dispatch(unfollowCompany(company._id));
    } else {
      await dispatch(followCompany(company._id));
    }
    // No need to reload - the redux state is updated directly
  };

  const renderCompanyItem = useCallback(
    ({ item }: { item: ICompany }) => (
      <CompanyCard
        company={item}
        onPress={() => navigation.navigate('CompanyDetail', { companyId: item._id })}
        onFollow={() => handleFollow(item)}
        isFollowing={item.isFollowed || false}
      />
    ),
    [navigation]
  );

  const renderFooter = () => {
    if (!isLoading) return null;
    return <Loading />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm công ty..."
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
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>{pagination.total} công ty</Text>
      </View>

      {/* Companies List */}
      {isLoading && companies.length === 0 ? (
        <Loading fullScreen text="Đang tải công ty..." />
      ) : companies.length === 0 ? (
        <EmptyState
          icon="business-outline"
          title="Không tìm thấy công ty"
          message="Thử thay đổi từ khóa tìm kiếm"
        />
      ) : (
        <FlatList
          data={companies}
          renderItem={renderCompanyItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
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
    paddingVertical: 12,
  },
  searchContainer: {
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
});

export default CompaniesScreen;
