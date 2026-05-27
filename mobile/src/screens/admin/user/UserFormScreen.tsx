import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usersService } from '../../../services/usersService';
import { companyService } from '../../../services/companyService';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import { ICompany } from '../../../types';

type RouteParams = {
  params?: {
    userId?: string;
  };
};

const UserFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const userId = (route.params as any)?.userId as string | undefined;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'HR' | 'ADMIN'>('USER');
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  
  // Company selection for HR role
  const [companies, setCompanies] = useState<ICompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<ICompany | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  useEffect(() => {
    if (userId) loadUser();
    loadCompanies();
  }, [userId]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await companyService.getCompanies({ pageSize: 100 });
      setCompanies(res.data.result || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadUser = async () => {
    setLoading(true);
    try {
      const res = await usersService.getUserById(userId!);
      const u = res.data;
      setName(u.name);
      setRole(u.role);
      setAge(u.age?.toString() || '');
      setGender(u.gender || '');
      setAddress(u.address || '');
      if (u.company && u.company._id) {
        setSelectedCompany(u.company as unknown as ICompany);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    // Simple email regex
    return /^\S+@\S+\.\S+$/.test(email);
  };

  const onSubmit = async () => {
    if (!name || (!userId && !email) || (!userId && !password)) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ');
      return;
    }
    if (role === 'HR' && !selectedCompany) {
      Alert.alert('Lỗi', 'Vui lòng chọn công ty cho HR');
      return;
    }
    if (!userId && !validateEmail(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    if (!userId && password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }
    setLoading(true);
    try {
      const payload: any = { name, role, age: parseInt(age, 10), gender, address };
      
      // Add company info for HR role
      if (role === 'HR' && selectedCompany) {
        payload.company = {
          _id: selectedCompany._id,
          name: selectedCompany.name,
        };
      } else if (role !== 'HR') {
        // Clear company if not HR
        payload.company = null;
      }
      
      if (userId) {
        await usersService.updateUser(userId, payload);
        Alert.alert('Thành công', 'Đã cập nhật');
      } else {
        await usersService.createUser({ ...payload, email, password });
        Alert.alert('Thành công', 'Đã tạo người dùng');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Lỗi', 'Yêu cầu thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const renderCompanyItem = ({ item }: { item: ICompany }) => (
    <TouchableOpacity
      style={styles.companyItem}
      onPress={() => {
        setSelectedCompany(item);
        setShowCompanyModal(false);
      }}
    >
      <Text style={styles.companyItemText}>{item.name}</Text>
      {selectedCompany?._id === item._id && (
        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Họ và tên</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      {!userId && (
        <>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </>
      )}

      {!userId && (
        <>
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Tối thiểu 6 ký tự"
            autoCapitalize="none"
          />
        </>
      )}

      <Text style={styles.label}>Tuổi</Text>
      <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />

      <Text style={styles.label}>Giới tính</Text>
      <TextInput style={styles.input} value={gender} onChangeText={setGender} />

      <Text style={styles.label}>Địa chỉ</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} />

      <Text style={styles.label}>Role</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {(['USER', 'HR', 'ADMIN'] as const).map((r) => (
          <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleActive]} onPress={() => setRole(r)}>
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Company Selection for HR Role */}
      {role === 'HR' && (
        <>
          <Text style={styles.label}>Công ty <Text style={{ color: COLORS.danger }}>*</Text></Text>
          <TouchableOpacity
            style={styles.companySelector}
            onPress={() => setShowCompanyModal(true)}
          >
            <Text style={selectedCompany ? styles.companySelectorText : styles.companySelectorPlaceholder}>
              {selectedCompany ? selectedCompany.name : 'Chọn công ty...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
        <Text style={styles.submitText}>{userId ? 'Cập nhật' : 'Tạo'}</Text>
      </TouchableOpacity>

      {/* Company Selection Modal */}
      <Modal
        visible={showCompanyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompanyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn công ty</Text>
              <TouchableOpacity onPress={() => setShowCompanyModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>
            {loadingCompanies ? (
              <Loading />
            ) : (
              <FlatList
                data={companies}
                keyExtractor={(item) => item._id}
                renderItem={renderCompanyItem}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Không có công ty nào</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  label: { marginTop: 12, color: COLORS.gray[600] },
  input: { backgroundColor: COLORS.white, padding: 12, borderRadius: 8, marginTop: 8 },
  roleBtn: { padding: 10, borderRadius: 8, backgroundColor: COLORS.white, marginRight: 8 },
  roleActive: { backgroundColor: COLORS.primary },
  roleText: { color: COLORS.gray[700] },
  roleTextActive: { color: COLORS.white },
  submitBtn: { marginTop: 24, marginBottom: 40, backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 },
  submitText: { color: COLORS.white, textAlign: 'center', fontWeight: '600' },
  companySelector: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companySelectorText: { color: COLORS.gray[800], fontSize: 14 },
  companySelectorPlaceholder: { color: COLORS.gray[400], fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.gray[800] },
  companyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  companyItemText: { fontSize: 14, color: COLORS.gray[700] },
  emptyText: { padding: 20, textAlign: 'center', color: COLORS.gray[400] },
});


export default UserFormScreen;
