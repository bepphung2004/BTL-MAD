import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES } from '../../../constants';
import { companyService, ICompanySearchParams } from '../../../services/companyService';
import { ICompany } from '../../../types';
import debounce from 'lodash.debounce';

const HrJoinCompanyScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<ICompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchCompanies = async (query: string) => {
    if (!query.trim()) {
      setCompanies([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await companyService.getCompanies({
        name: query.trim(),
        pageSize: 20,
        isActive: true,
      });
      setCompanies(res.data?.result || []);
    } catch (err) {
      console.error('Search companies error:', err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((query: string) => searchCompanies(query), 500),
    [],
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleRequestJoin = (company: ICompany) => {
    Alert.alert(
      'Xác nhận',
      `Bạn muốn gửi yêu cầu tham gia công ty "${company.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi yêu cầu',
          onPress: async () => {
            setRequestingId(company._id);
            try {
              await companyService.requestJoinCompany(company._id);
              Alert.alert(
                'Thành công',
                'Yêu cầu tham gia đã được gửi. Vui lòng chờ HR của công ty duyệt.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ],
              );
            } catch (err: any) {
              const msg =
                err?.response?.data?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.';
              Alert.alert('Lỗi', msg);
            } finally {
              setRequestingId(null);
            }
          },
        },
      ],
    );
  };

  const renderCompanyItem = ({ item }: { item: ICompany }) => (
    <View style={styles.companyCard}>
      <View style={styles.companyCardContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="business" size={28} color={COLORS.gray[400]} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.companyInfo}>
          <Text style={styles.companyName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.address ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray[400]} />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          ) : null}
          {item.scale ? (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color={COLORS.gray[400]} />
              <Text style={styles.infoText}>{item.scale} nhân viên</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Join Button */}
      <TouchableOpacity
        style={[
          styles.joinButton,
          requestingId === item._id && styles.joinButtonDisabled,
        ]}
        onPress={() => handleRequestJoin(item)}
        disabled={requestingId === item._id}
        activeOpacity={0.7}
      >
        {requestingId === item._id ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="log-in-outline" size={18} color={COLORS.white} />
            <Text style={styles.joinButtonText}>Tham gia</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[800]} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Tham gia công ty</Text>
            <Text style={styles.headerSubtitle}>
              Tìm và gửi yêu cầu tham gia công ty
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm tên công ty..."
              placeholderTextColor={COLORS.gray[400]}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => searchCompanies(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setCompanies([]);
                  setHasSearched(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color={COLORS.info} />
          <Text style={styles.infoBannerText}>
            Sau khi gửi yêu cầu, HR của công ty sẽ nhận được thông báo và duyệt yêu cầu của bạn.
          </Text>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
          </View>
        ) : (
          <FlatList
            data={companies}
            keyExtractor={(item) => item._id}
            renderItem={renderCompanyItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              hasSearched ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="search-outline" size={48} color={COLORS.gray[300]} />
                  </View>
                  <Text style={styles.emptyTitle}>Không tìm thấy công ty</Text>
                  <Text style={styles.emptySubtitle}>
                    Hãy thử tìm kiếm với từ khóa khác hoặc tạo công ty mới
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="business-outline" size={48} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Tìm công ty của bạn</Text>
                  <Text style={styles.emptySubtitle}>
                    Nhập tên công ty vào ô tìm kiếm phía trên để bắt đầu
                  </Text>
                </View>
              )
            }
          />
        )}
      </KeyboardAvoidingView>
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
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[50],
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
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '10',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  companyCard: {
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
  companyCardContent: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  logoContainer: {
    marginRight: 14,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 6,
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
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray[50],
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
});

export default HrJoinCompanyScreen;
