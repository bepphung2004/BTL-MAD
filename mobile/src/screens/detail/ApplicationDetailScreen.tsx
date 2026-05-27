import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, APPLICATION_STATUS } from '../../constants';
import { Loading } from '../../components';
import { applicationService } from '../../services/applicationService';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { IApplication } from '../../types';

type ApplicationDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ApplicationDetail'>;
  route: RouteProp<RootStackParamList, 'ApplicationDetail'>;
};

const ApplicationDetailScreen: React.FC<ApplicationDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { applicationId } = route.params;

  const [application, setApplication] = useState<IApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      const response = await applicationService.getApplicationById(applicationId);
      setApplication(response.data);
    } catch (error) {
      console.error('Failed to load application:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin hồ sơ');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case APPLICATION_STATUS.PENDING:
        return { label: 'Đang chờ xử lý', color: COLORS.warning, icon: 'time' as const };
      case APPLICATION_STATUS.REVIEWING:
        return { label: 'Đang xem xét', color: COLORS.info, icon: 'eye' as const };
      case APPLICATION_STATUS.APPROVED:
        return { label: 'Đã được duyệt', color: COLORS.success, icon: 'checkmark-circle' as const };
      case APPLICATION_STATUS.REJECTED:
        return { label: 'Đã bị từ chối', color: COLORS.danger, icon: 'close-circle' as const };
      default:
        return { label: status, color: COLORS.gray[500], icon: 'help' as const };
    }
  };

  const [withdrawing, setWithdrawing] = useState(false);

  const handleViewCV = () => {
    const cvData = application?.cvId || application?.cv;
    const cv = typeof cvData === 'object' ? cvData : null;
    if (cv?.url) {
      Linking.openURL(cv.url);
    } else {
      Alert.alert('Thông báo', 'Không thể xem CV');
    }
  };

  const handleWithdrawApplication = () => {
    Alert.alert(
      'Xác nhận rút đơn',
      'Bạn có chắc chắn muốn rút đơn ứng tuyển này không? Bạn có thể nộp lại sau.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rút đơn',
          style: 'destructive',
          onPress: async () => {
            setWithdrawing(true);
            try {
              await applicationService.withdrawApplication(applicationId);
              Alert.alert('Thành công', 'Đã rút đơn ứng tuyển', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert(
                'Lỗi',
                error?.response?.data?.message || 'Không thể rút đơn ứng tuyển'
              );
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải..." />;
  }

  if (!application) {
    return null;
  }

  // Handle both field names: job/jobId, company/companyId, cv/cvId (API returns jobId, companyId, cvId)
  const jobData = application.jobId || application.job;
  const job = typeof jobData === 'object' ? jobData : null;
  
  const companyData = application.companyId || application.company || (job as any)?.company;
  const company = typeof companyData === 'object' ? companyData : null;
  
  const cvData = application.cvId || application.cv;
  const cv = typeof cvData === 'object' ? cvData : null;
  
  const statusInfo = getStatusInfo(application.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.color + '10' }]}>
          <Ionicons name={statusInfo.icon} size={48} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
          <Text style={styles.statusDate}>
            Ngày ứng tuyển: {new Date(application.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>

        {/* Job Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin việc làm</Text>
          <TouchableOpacity
            style={styles.jobCard}
            onPress={() => job && navigation.navigate('JobDetail', { jobId: job._id })}
          >
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job?.name || 'Vị trí ứng tuyển'}</Text>
              <Text style={styles.companyName}>{company?.name || 'Công ty'}</Text>
              <View style={styles.jobMeta}>
                <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
                <Text style={styles.jobMetaText}>{job?.location}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* CV Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CV đã nộp</Text>
          <TouchableOpacity style={styles.cvCard} onPress={handleViewCV}>
            <View style={styles.cvIcon}>
              <Ionicons name={cv?.url?.toLowerCase().endsWith('.docx') || cv?.url?.toLowerCase().endsWith('.doc') ? 'document-text' : 'document'} size={28} color={cv?.url?.toLowerCase().endsWith('.docx') || cv?.url?.toLowerCase().endsWith('.doc') ? '#2B6CB0' : '#E53E3E'} />
              <Text style={{ fontSize: 8, fontWeight: '700', color: cv?.url?.toLowerCase().endsWith('.docx') || cv?.url?.toLowerCase().endsWith('.doc') ? '#2B6CB0' : '#E53E3E', marginTop: 2 }}>
                {cv?.url?.toLowerCase().endsWith('.docx') || cv?.url?.toLowerCase().endsWith('.doc') ? 'DOCX' : 'PDF'}
              </Text>
            </View>
            <View style={styles.cvInfo}>
              <Text style={styles.cvName}>{cv?.title || 'CV'}</Text>
              <Text style={styles.cvDate}>
                Cập nhật: {cv ? new Date(application.updatedAt).toLocaleDateString('vi-VN') : ''}
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến trình</Text>
          <View style={styles.timeline}>
            {[
              { label: 'Đã nộp hồ sơ', date: application.createdAt, done: true },
              {
                label: 'Đang xem xét',
                date: application.status !== APPLICATION_STATUS.PENDING ? application.updatedAt : null,
                done: application.status !== APPLICATION_STATUS.PENDING,
              },
              {
                label: 'Kết quả',
                date:
                  application.status === APPLICATION_STATUS.APPROVED ||
                  application.status === APPLICATION_STATUS.REJECTED
                    ? application.updatedAt
                    : null,
                done:
                  application.status === APPLICATION_STATUS.APPROVED ||
                  application.status === APPLICATION_STATUS.REJECTED,
              },
            ].map((step, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.done && styles.timelineDotDone,
                    ]}
                  >
                    {step.done && (
                      <Ionicons name="checkmark" size={12} color={COLORS.white} />
                    )}
                  </View>
                  {index < 2 && (
                    <View
                      style={[
                        styles.timelineLine,
                        step.done && styles.timelineLineDone,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone]}>
                    {step.label}
                  </Text>
                  {step.date && (
                    <Text style={styles.timelineDate}>
                      {new Date(step.date).toLocaleDateString('vi-VN')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Withdraw Button - Only show if status is PENDING */}
        {application.status === APPLICATION_STATUS.PENDING && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.withdrawButton, withdrawing && styles.withdrawButtonDisabled]}
              onPress={handleWithdrawApplication}
              disabled={withdrawing}
            >
              <Ionicons name="close-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.withdrawButtonText}>
                {withdrawing ? 'Đang xử lý...' : 'Rút đơn ứng tuyển'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.withdrawNote}>
              💡 Bạn có thể rút đơn và nộp lại với CV khác bất cứ lúc nào
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statusCard: {
    margin: SIZES.padding,
    padding: SIZES.padding * 1.5,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  statusDate: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 12,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  companyName: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    marginBottom: 4,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobMetaText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
  },
  cvCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
  },
  cvIcon: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cvName: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.gray[800],
  },
  cvDate: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: COLORS.success,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.gray[200],
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: COLORS.success,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontSize: SIZES.md,
    color: COLORS.gray[400],
  },
  timelineLabelDone: {
    color: COLORS.gray[800],
    fontWeight: '500',
  },
  timelineDate: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: SIZES.radius,
    gap: 8,
  },
  withdrawButtonDisabled: {
    opacity: 0.6,
  },
  withdrawButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  withdrawNote: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ApplicationDetailScreen;
