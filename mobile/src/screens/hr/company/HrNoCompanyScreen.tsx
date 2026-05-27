import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../../constants';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HrStackParamList = {
  HrCreateCompany: undefined;
  HrJoinCompany: undefined;
};

const HrNoCompanyScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="business-outline" size={64} color={COLORS.primary} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Chào mừng bạn!</Text>
        <Text style={styles.subtitle}>
          Bạn chưa tham gia công ty nào. Hãy tạo công ty mới hoặc tham gia một công ty có sẵn để bắt đầu.
        </Text>

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('HrCreateCompany')}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="add-circle" size={28} color={COLORS.white} />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.primaryButtonTitle}>Tạo công ty mới</Text>
              <Text style={styles.primaryButtonSubtitle}>
                Đăng ký công ty và bắt đầu tuyển dụng
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('HrJoinCompany')}
          >
            <View style={[styles.buttonIconContainer, styles.secondaryIconContainer]}>
              <Ionicons name="people" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.secondaryButtonTitle}>Tham gia công ty</Text>
              <Text style={styles.secondaryButtonSubtitle}>
                Tìm và gửi yêu cầu tham gia công ty có sẵn
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* Help hint */}
        <View style={styles.helpCard}>
          <Ionicons name="bulb-outline" size={18} color={COLORS.warning} />
          <Text style={styles.helpText}>
            Nếu công ty của bạn đã có trên hệ thống, hãy chọn "Tham gia công ty" để gửi yêu cầu và chờ duyệt từ HR trong công ty đó.
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
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.gray[800],
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  actionsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryIconContainer: {
    backgroundColor: COLORS.primary + '12',
  },
  buttonTextContainer: {
    flex: 1,
  },
  primaryButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 3,
  },
  primaryButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  secondaryButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 3,
  },
  secondaryButtonSubtitle: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '10',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray[600],
    lineHeight: 19,
  },
});

export default HrNoCompanyScreen;
