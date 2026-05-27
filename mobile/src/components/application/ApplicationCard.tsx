import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, APPLICATION_STATUS } from '../../constants';
import { IApplication } from '../../types';

interface ApplicationCardProps {
  application: IApplication;
  onPress: () => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onPress,
}) => {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case APPLICATION_STATUS.PENDING:
        return { label: 'Đang chờ', color: COLORS.warning, icon: 'time-outline' as const };
      case APPLICATION_STATUS.REVIEWING:
        return { label: 'Đang xem xét', color: COLORS.info, icon: 'eye-outline' as const };
      case APPLICATION_STATUS.APPROVED:
        return { label: 'Đã duyệt', color: COLORS.success, icon: 'checkmark-circle-outline' as const };
      case APPLICATION_STATUS.REJECTED:
        return { label: 'Từ chối', color: COLORS.danger, icon: 'close-circle-outline' as const };
      default:
        return { label: status, color: COLORS.gray[500], icon: 'help-outline' as const };
    }
  };

  const statusInfo = getStatusInfo(application.status);
  
  // Handle both field names: job/jobId, company/companyId (API returns jobId, companyId)
  const jobData = application.jobId || application.job;
  const job = typeof jobData === 'object' ? jobData : null;
  
  // Company can be nested in job or directly on application
  const companyData = application.companyId || application.company || (job as any)?.company;
  const company = typeof companyData === 'object' ? companyData : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobName} numberOfLines={2}>
            {job?.name || 'Vị trí ứng tuyển'}
          </Text>
          <Text style={styles.companyName}>{company?.name || 'Công ty'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
          <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.dateText}>
            Ứng tuyển: {new Date(application.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  companyName: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
  },
});
