import React, { useEffect, useState } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { Loading, EmptyState } from '../../components';
import { notificationService } from '../../services/notificationService';
import { INotification } from '../../types';
import { useAppSelector } from '../../store/hooks';
import { RootStackParamList } from '../../navigation/AppNavigator';

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAppSelector((state) => state.auth);
  const userRole = user?.role;

  useEffect(() => {
    loadNotifications();
    const unsubscribe = navigation.addListener('focus', loadNotifications);
    return unsubscribe;
  }, [navigation]);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data.result || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  // Handle notification click - navigate to appropriate screen based on targetType
  const handleNotificationPress = async (notification: INotification) => {
    // Mark as read first
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // Navigate based on targetType and user role
    const { targetType, targetId, data } = notification;
    
    if (!targetType || targetType === 'none' || !targetId) {
      return; // No navigation for system notifications without target
    }

    // Normalize role to uppercase for comparison
    const role = userRole?.toUpperCase?.() || userRole;
    
    try {
      switch (targetType) {
        case 'job':
          // User role sees JobDetail, HR can see their job detail
          if (role === 'USER') {
            navigation.navigate('JobDetail', { jobId: targetId });
          } else if (role === 'HR' && data?.jobId) {
            // HR navigates to HrJobDetail with job data
            navigation.navigate('HrJobDetail', { job: { _id: data.jobId } });
          }
          break;

        case 'company':
          // Admin sees AdminCompanyDetail, User sees CompanyDetail, HR sees their company
          if (role === 'ADMIN') {
            navigation.navigate('AdminCompanyDetail', { companyId: targetId });
          } else if (role === 'USER') {
            navigation.navigate('CompanyDetail', { companyId: targetId });
          }
          // HR doesn't need to navigate to company detail from notification, they can use tab
          break;

        case 'application':
          // User sees their application detail, HR sees HrApplicationDetail
          if (role === 'USER') {
            navigation.navigate('ApplicationDetail', { applicationId: targetId });
          } else if (role === 'HR') {
            navigation.navigate('HrApplicationDetail', { applicationId: targetId });
          }
          break;

        default:
          console.log('Unknown target type:', targetType);
          break;
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPLICATION':
      case 'RESUME':
        return 'document-text';
      case 'JOB':
        return 'briefcase';
      case 'COMPANY':
        return 'business';
      default:
        return 'notifications';
    }
  };

  const renderNotificationItem = ({ item }: { item: INotification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, !item.isRead && styles.unreadIcon]}>
        <Ionicons
          name={getNotificationIcon(item.type) as any}
          size={24}
          color={item.isRead ? COLORS.gray[400] : COLORS.primary}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
          {item.title}
        </Text>
        {item.content ? (
          <Text style={styles.message} numberOfLines={3}>{item.content}</Text>
        ) : null}
        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen text="Đang tải thông báo..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {notifications.some((n) => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Đánh dấu đã đọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Không có thông báo"
          message="Bạn chưa có thông báo nào"
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  markAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  unreadItem: {
    backgroundColor: COLORS.primary + '05',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadIcon: {
    backgroundColor: COLORS.primary + '15',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: SIZES.md,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  message: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: COLORS.gray[400],
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.gray[100],
  },
});

export default NotificationsScreen;
