import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { RootStackParamList, MainTabParamList } from '../../navigation/AppNavigator';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type ProfileScreenProps = {
  navigation: ProfileScreenNavigationProp;
};

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const cvItem: MenuItem = {
    icon: 'document-text-outline',
    title: 'Quản lý CV',
    subtitle: 'Xem và quản lý CV của bạn',
    onPress: () => navigation.navigate('MyCVs'),
  };

  const applicationsItem: MenuItem = {
    icon: 'folder-outline',
    title: 'Hồ sơ ứng tuyển',
    subtitle: 'Theo dõi đơn ứng tuyển',
    onPress: () => navigation.navigate('MyApplications'),
  };

  const subscriptionItem: MenuItem = {
    icon: 'mail-outline',
    title: 'Đăng ký nhận tin',
    subtitle: 'Nhận email về việc làm mới',
    onPress: () => navigation.navigate('JobSubscription'),
  };

  const firstSection: MenuItem[] = [
    {
      icon: 'person-outline',
      title: 'Chỉnh sửa hồ sơ',
      subtitle: 'Cập nhật thông tin cá nhân',
      onPress: () => navigation.navigate('EditProfile'),
    },
    // Only show CV, Applications and Subscription to plain USER role
    ...(user?.role === 'USER' ? [cvItem, applicationsItem, subscriptionItem] : []),
  ];

  const secondSection: MenuItem[] = [
    {
      icon: 'lock-closed-outline',
      title: 'Đổi mật khẩu',
      onPress: () => navigation.navigate('ChangePassword'),
    },
  ];

  const thirdSection: MenuItem[] = [
    {
      icon: 'log-out-outline',
      title: 'Đăng xuất',
      onPress: handleLogout,
      color: COLORS.danger,
    },
  ];

  const menuItems: MenuItem[][] = [firstSection, secondSection, thirdSection];

  const renderMenuItem = (item: MenuItem, index: number) => (
    <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
      <View style={[styles.menuIcon, item.color ? { backgroundColor: item.color + '15' } : undefined]}>
        <Ionicons
          name={item.icon}
          size={22}
          color={item.color || COLORS.gray[600]}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, item.color ? { color: item.color } : undefined]}>
          {item.title}
        </Text>
        {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name || 'Người dùng'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'USER'}</Text>
          </View>
        </View>

        {/* Menu Sections */}
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            {section.map((item, index) => renderMenuItem(item, index))}
          </View>
        ))}

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.version}>Phiên bản 1.0.0</Text>
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
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: COLORS.white,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.gray[100],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.gray[800],
  },
  menuSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  version: {
    fontSize: SIZES.sm,
    color: COLORS.gray[400],
  },
});

export default ProfileScreen;
