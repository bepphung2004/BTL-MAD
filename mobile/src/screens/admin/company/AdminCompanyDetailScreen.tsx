import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Alert, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { companyService } from '../../../services/companyService';
import { ICompany } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import RenderHTML from 'react-native-render-html';
import { Ionicons } from '@expo/vector-icons';

type AdminStackParamList = {
  CompanyDetail: { companyId: string };
};

const AdminCompanyDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<AdminStackParamList, 'CompanyDetail'>>();
  const navigation = useNavigation();
  const { companyId } = route.params;
  const [company, setCompany] = useState<ICompany | null>(null);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();

  const load = async () => {
    setLoading(true);
    try {
      const res = await companyService.getCompanyById(companyId);
      setCompany(res.data);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải thông tin công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [companyId]);

  // Remove HR from company
  const handleRemoveHr = (hr: any) => {
    if (!company) return;
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ${hr.name} khỏi công ty?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await companyService.removeHrFromCompany(hr._id, company._id);
              Alert.alert('Thành công', `Đã xóa ${hr.name} khỏi công ty`);
              load();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xóa HR');
            }
          },
        },
      ]
    );
  };


  const confirmToggleActive = () => {
    if (!company) return;
    Alert.alert(
      company.isActive ? 'Xác nhận hủy kích hoạt' : 'Xác nhận kích hoạt',
      company.isActive
        ? 'Bạn có chắc chắn muốn hủy kích hoạt công ty này?'
        : 'Bạn có chắc chắn muốn kích hoạt công ty này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            setLoading(true);
            try {
              await companyService.verifyCompany(company._id);
              Alert.alert('Thành công', 'Cập nhật trạng thái công ty thành công');
              load();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !company) return <Loading />;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
          {!company ? (
            <Loading />
          ) : (
            <>
              {company.logo ? <Image source={{ uri: company.logo }} style={styles.logo} resizeMode="contain" /> : null}
              <Text style={styles.name}>{company.name}</Text>
              {company.address ? <Text style={styles.address}>Địa chỉ: {company.address}</Text> : null}
              <Text style={[styles.status, company.isActive ? styles.statusActive : styles.statusInactive]}>
                Trạng thái: {company.isActive ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mô tả</Text>
                {company.description ? (
                  <RenderHTML contentWidth={width - 45} source={{ html: company.description }} />
                ) : (
                  <Text style={styles.empty}>Không có mô tả</Text>
                )}
              </View>

              {/* HR Section */}
              <View style={styles.hrSection}>
                <View style={styles.hrSectionHeader}>
                  <Text style={styles.hrTitle}>HR của công ty ({company.hrs?.length || 0})</Text>
                </View>
                {company.hrs && company.hrs.length > 0 ? (
                  company.hrs.map((hr) => (
                    <View key={hr._id} style={styles.hrItem}>
                      <View style={styles.hrAvatarContainer}>
                        {hr.avatar ? (
                          <Image source={{ uri: hr.avatar }} style={styles.hrAvatar} />
                        ) : (
                          <View style={styles.hrAvatarPlaceholder}>
                            <Text style={styles.hrAvatarText}>
                              {hr.name?.charAt(0).toUpperCase() || 'H'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.hrInfo}>
                        <Text style={styles.hrName}>{hr.name}</Text>
                        <Text style={styles.hrEmail}>{hr.email}</Text>
                        <Text style={styles.hrRole}>Vai trò: {hr.role}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeHrButton}
                        onPress={() => handleRemoveHr(hr)}
                      >
                        <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.empty}>Chưa có HR nào trong công ty</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
        {company && (
          <View style={styles.footerFloatBtnWrap}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: company.isActive ? COLORS.gray[400] : COLORS.primary }]}
              onPress={confirmToggleActive}
            >
              <Text style={[styles.btnText, { color: company.isActive ? COLORS.black : COLORS.white }]}> 
                {company.isActive ? 'Hủy kích hoạt' : 'Kích hoạt'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  logo: { width: '100%', height: 160, marginBottom: 12, borderRadius: 8, backgroundColor: COLORS.white },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  address: { color: COLORS.gray[700], marginBottom: 8 },
  status: { marginBottom: 12 },
  statusActive: { color: '#22c55e' },
  statusInactive: { color: COLORS.danger },
  section: { backgroundColor: COLORS.white, padding: 12, borderRadius: 8, marginBottom: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  empty: { color: COLORS.gray[600] },
  btn: { padding: 16, borderRadius: 8, alignItems: 'center', minWidth: 160 },
  footerFloatBtnWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    padding: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  btnText: { fontWeight: '700' },
  hrSection: { marginTop: 20, backgroundColor: COLORS.white, borderRadius: 8, padding: 12 },
  hrSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hrTitle: { fontWeight: '700', fontSize: 16 },
  hrItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  hrAvatarContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
  },
  hrAvatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  hrInfo: { flex: 1 },
  hrName: { fontWeight: '600', fontSize: 15 },
  hrEmail: { color: COLORS.gray[700], marginTop: 2 },
  hrRole: { color: COLORS.gray[500], marginTop: 2 },
  removeHrButton: {
    padding: 4,
  },
});

export default AdminCompanyDetailScreen;
