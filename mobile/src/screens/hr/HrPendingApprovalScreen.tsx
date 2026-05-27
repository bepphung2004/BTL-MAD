import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants';

const HrPendingApprovalScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.iconCircleOuter}>
          <View style={styles.iconCircle}>
            <Ionicons name="hourglass-outline" size={56} color="#d97706" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Tài khoản đang chờ duyệt</Text>

        {/* Description */}
        <Text style={styles.description}>
          Tài khoản của bạn hiện đang chờ Admin duyệt. Sau khi được duyệt, bạn sẽ có thể sử dụng
          đầy đủ các tính năng quản lý công ty và tuyển dụng.
        </Text>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Thông báo</Text>
              <Text style={styles.infoDescription}>
                Bạn vẫn có thể xem thông báo trong khi chờ duyệt
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Hồ sơ cá nhân</Text>
              <Text style={styles.infoDescription}>
                Bạn có thể chỉnh sửa thông tin cá nhân ngay bây giờ
              </Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.contactCard}>
          <Ionicons name="call-outline" size={18} color={COLORS.info} />
          <Text style={styles.contactText}>
            Nếu cần hỗ trợ, vui lòng liên hệ Admin.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  iconCircleOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fde68a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gray[800],
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 13,
    color: COLORS.gray[500],
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.gray[100],
    marginVertical: 4,
  },
  contactCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '10',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
  },
});

export default HrPendingApprovalScreen;
