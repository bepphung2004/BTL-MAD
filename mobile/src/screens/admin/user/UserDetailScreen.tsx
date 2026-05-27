import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { usersService } from '../../../services/usersService';
import { IUser } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import { StackNavigationProp } from 'node_modules/@react-navigation/stack/lib/typescript/src/types';

type AdminStackParamList = {
  UserForm: { userId?: string };
};

type RouteParams = {
  params: {
    userId: string;
  };
};

const UserDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<StackNavigationProp<AdminStackParamList>>();
  const userId = (route.params as any)?.userId as string;

  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersService.getUserById(userId);
      setUser(res.data);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, userId]);

  const onDelete = async () => {
    Alert.alert('Xóa', 'Bạn có chắc muốn xóa người dùng này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await usersService.deleteUser(userId);
            Alert.alert('Thành công', 'Đã xóa');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Lỗi', 'Không thể xóa người dùng');
          }
        },
      },
    ]);
  };

  if (loading || !user) return <Loading />;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Họ và tên</Text>
      <Text style={styles.value}>{user.name}</Text>

      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{user.email}</Text>

      <Text style={styles.label}>Role</Text>
      <Text style={styles.value}>{user.role}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('UserForm', { userId })}>
          <Text style={styles.editText}>Chỉnh sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  label: { marginTop: 12, color: COLORS.gray[600] },
  value: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 24 },
  editBtn: { flex: 1, padding: 12, backgroundColor: COLORS.primary, borderRadius: 8, marginRight: 8 },
  editText: { color: COLORS.white, textAlign: 'center' },
  deleteBtn: { flex: 1, padding: 12, backgroundColor: COLORS.danger || '#e74c3c', borderRadius: 8 },
  deleteText: { color: COLORS.white, textAlign: 'center' },
});

export default UserDetailScreen;
