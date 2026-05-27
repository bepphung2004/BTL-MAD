import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, useWindowDimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../../../constants';
import { jobService } from '../../../services/jobService';
import { NativeStackNavigationProp } from 'node_modules/@react-navigation/native-stack/lib/typescript/src/types';

type HrStackParamList = {
    HrJobDetail: { job: any };
    HrApplicationsList: { jobId: string };
};

const HrJobDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList, 'HrJobDetail'>>();
  const job = (route.params as any)?.job;
  const [localJob, setLocalJob] = useState(job);
  const { width } = useWindowDimensions();

  const load = async () => {
    if (!job?._id) return;
    try {
      const res = await jobService.getJobById(job._id);
      setLocalJob(res.data);
    } catch (err) {
      // ignore fetch errors here
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [job?._id]),
  );

  const displayJob = localJob;
  
  if (!displayJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray[300]} />
          <Text style={styles.errorText}>Không tìm thấy công việc</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = async () => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc muốn xóa tin tuyển dụng này? Hành động này không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await jobService.deleteJob(job._id);
          Alert.alert('Thành công', 'Đã xóa tin tuyển dụng', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (err) {
          Alert.alert('Lỗi', 'Không thể xóa tin tuyển dụng');
        }
      } }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{displayJob.name}</Text>
            <View style={[
              styles.statusBadge,
              displayJob.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: displayJob.isActive ? '#22c55e' : '#ef4444' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: displayJob.isActive ? '#22c55e' : '#ef4444' }
              ]}>
                {displayJob.isActive ? 'Đang tuyển' : 'Ngưng tuyển'}
              </Text>
            </View>
          </View>
          
          <View style={styles.applicantsRow}>
            <View style={styles.applicantsBox}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
              <Text style={styles.applicantsCount}>{displayJob.applicationsCount ?? 0}</Text>
              <Text style={styles.applicantsLabel}>ứng viên đã ứng tuyển</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin chung</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Địa điểm</Text>
              <Text style={styles.infoValue}>{displayJob.location || 'Chưa cập nhật'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Mức lương</Text>
              <Text style={styles.infoValue}>
                {displayJob.salary ? `${displayJob.salary.toLocaleString()} ₫` : 'Thương lượng'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Thời gian tuyển</Text>
              <Text style={styles.infoValue}>
                {displayJob.startDate ? new Date(displayJob.startDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}
                {' → '}
                {displayJob.endDate ? new Date(displayJob.endDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}
              </Text>
            </View>
          </View>

          {displayJob.level && (
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="bar-chart-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Cấp bậc</Text>
                <Text style={styles.infoValue}>{displayJob.level}</Text>
              </View>
            </View>
          )}

          {displayJob.quantity && (
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="people-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Số lượng tuyển</Text>
                <Text style={styles.infoValue}>{displayJob.quantity} người</Text>
              </View>
            </View>
          )}
        </View>

        {/* Skills Card */}
        {displayJob.skills && displayJob.skills.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Kỹ năng yêu cầu</Text>
            <View style={styles.skillsContainer}>
              {displayJob.skills.map((skill: string, index: number) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mô tả công việc</Text>
          {displayJob.description ? (
            <RenderHTML
              contentWidth={width - 64}
              source={{ html: displayJob.description }}
              baseStyle={styles.htmlContent}
            />
          ) : (
            <Text style={styles.emptyText}>Không có mô tả</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.viewApplicantsBtn} 
            onPress={() => navigation.navigate('HrApplicationsList', { jobId: job._id })}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={20} color={COLORS.white} />
            <Text style={styles.viewApplicantsBtnText}>Xem danh sách ứng viên</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => navigation.navigate('HrJobForm' as any, { job })}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.editBtnText}>Chỉnh sửa</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.deleteBtnText}>Xóa</Text>
            </TouchableOpacity>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeInactive: {
    backgroundColor: '#fee2e2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  applicantsRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  applicantsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applicantsCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  applicantsLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.gray[800],
    fontWeight: '500',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: `${COLORS.primary}15`,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  htmlContent: {
    fontSize: 14,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray[400],
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginTop: 8,
  },
  viewApplicantsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  viewApplicantsBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: 12,
  },
});

export default HrJobDetailScreen;
