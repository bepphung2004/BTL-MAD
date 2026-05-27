import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APPLICATION_STATUS, COLORS } from "../../../constants";
import { applicationService } from "../../../services/applicationService";
import { IApplication, ICompany, IJob, IUser } from "../../../types";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: COLORS.warning,
  REVIEWING: COLORS.info,
  APPROVED: COLORS.success,
  REJECTED: COLORS.danger,
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  PENDING: 'time-outline',
  REVIEWING: 'eye-outline',
  APPROVED: 'checkmark-circle-outline',
  REJECTED: 'close-circle-outline',
};

type HrStackParamList = {
  HrApplicationDetail: { applicationId: string };
  InterviewInvite: {
    user: IUser | undefined;
    job: IJob | undefined;
    company: ICompany | undefined;
    email: string;
  };
};

const HrApplicationDetailScreen: React.FC = () => {
  const route = useRoute();
  const { applicationId } =
    route.params as HrStackParamList["HrApplicationDetail"];
  const [application, setApplication] = useState<IApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList>>();

  const load = async () => {
    setLoading(true);
    try {
      const res = await applicationService.getApplicationById(applicationId);
      setApplication(res.data);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải thông tin ứng viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [applicationId]);

  const handleUpdateStatus = (status: string) => {
    if (!application) return;
    const statusLabel = APPLICATION_STATUS[status as keyof typeof APPLICATION_STATUS] || status;
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn chuyển trạng thái CV này sang "${statusLabel}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: 'default',
          onPress: async () => {
            await doUpdateStatus(status);
          },
        },
      ]
    );
  };

  const doUpdateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await applicationService.updateApplicationStatus(
        application!._id,
        status,
      );
      await load();
      Alert.alert(
        "Thành công",
        "Cập nhật trạng thái thành công",
        [
          {
            text: 'OK',
            onPress: () => {
              if (status === 'REVIEWING') {
                Alert.alert(
                  "Gửi thư mời phỏng vấn",
                  "Bạn có muốn gửi thư mời phỏng vấn tới ứng viên này không?",
                  [
                    { text: "Không", style: "cancel" },
                    {
                      text: "Có",
                      style: "default",
                      onPress: () => {
                        navigation.navigate("InterviewInvite", {
                          user:
                            typeof application?.userId === "object"
                              ? application.userId
                              : undefined,
                          job:
                            typeof application?.jobId === "object"
                              ? application.jobId
                              : undefined,
                          company:
                            typeof application?.companyId === "object"
                              ? application.companyId
                              : undefined,
                          email:
                            typeof application?.userId === "object" && application.userId
                              ? application.userId.email
                              : "",
                        });
                      },
                    },
                  ]
                );
              }
            }
          }
        ]
      );
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }
  if (!application) return null;

  const user =
    typeof application.userId === "object" && application.userId !== null
      ? application.userId
      : undefined;
  const cv =
    typeof application.cvId === "object" && application.cvId !== null
      ? application.cvId
      : undefined;
  const job =
    typeof application.jobId === "object" && application.jobId !== null
      ? application.jobId
      : undefined;

  const currentStatusColor = STATUS_COLORS[application.status] || COLORS.gray[500];
  const currentStatusIcon = STATUS_ICONS[application.status] || 'help-circle-outline';

  return (
    <>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Candidate Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.candidateRow}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.candidateInfo}>
                <Text style={styles.candidateName}>{user?.name || "Ứng viên ẩn danh"}</Text>
                <Text style={styles.candidateEmail}>{user?.email || "-"}</Text>
              </View>
            </View>

            <View style={[styles.statusBadgeLarge, { backgroundColor: currentStatusColor + '15' }]}>
              <Ionicons name={currentStatusIcon} size={18} color={currentStatusColor} />
              <Text style={[styles.statusBadgeLargeText, { color: currentStatusColor }]}>
                {APPLICATION_STATUS[application.status as keyof typeof APPLICATION_STATUS]}
              </Text>
            </View>
          </View>

          {/* Application Info Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin ứng tuyển</Text>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Vị trí ứng tuyển</Text>
                <Text style={styles.infoValue}>{job?.name || 'Không xác định'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ngày nộp hồ sơ</Text>
                <Text style={styles.infoValue}>
                  {new Date(application.createdAt).toLocaleDateString("vi-VN", {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>CV</Text>
                <Text style={styles.infoValue}>{cv?.title || "CV"}</Text>
              </View>
              {cv?.url && (
                <TouchableOpacity
                  style={styles.viewCvBtn}
                  onPress={() => Linking.openURL(cv.url)}
                >
                  <Ionicons name="eye-outline" size={16} color={COLORS.white} />
                  <Text style={styles.viewCvBtnText}>Xem CV</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Status Actions Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cập nhật trạng thái</Text>
            <View style={styles.statusGrid}>
              {(Object.keys(APPLICATION_STATUS) as Array<keyof typeof APPLICATION_STATUS>).map((key) => {
                const isActive = application.status === key;
                const statusColor = STATUS_COLORS[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.statusActionBtn,
                      isActive && { backgroundColor: statusColor + '15', borderColor: statusColor }
                    ]}
                    disabled={updating || isActive}
                    onPress={() => handleUpdateStatus(key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={STATUS_ICONS[key]} 
                      size={20} 
                      color={isActive ? statusColor : COLORS.gray[500]} 
                    />
                    <Text style={[
                      styles.statusActionBtnText,
                      { color: isActive ? statusColor : COLORS.gray[600] },
                      isActive && { fontWeight: '700' }
                    ]}>
                      {APPLICATION_STATUS[key]}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeIndicator, { backgroundColor: statusColor }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {updating && <ActivityIndicator style={{ marginTop: 12 }} color={COLORS.primary} />}
          </View>

          {/* History Card */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color={COLORS.gray[700]} />
              <Text style={styles.sectionTitle}>Lịch sử xử lý</Text>
            </View>
            
            {application.history && application.history.length > 0 ? (
              <View style={styles.timeline}>
                {application.history.map((h, idx) => {
                  const historyStatusColor = STATUS_COLORS[h.status] || COLORS.gray[500];
                  const isLast = idx === application.history.length - 1;
                  return (
                    <View key={idx} style={styles.timelineItem}>
                      <View style={styles.timelineDotContainer}>
                        <View style={[styles.timelineDot, { backgroundColor: historyStatusColor }]} />
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={[styles.historyStatusBadge, { backgroundColor: historyStatusColor + '15' }]}>
                          <Text style={[styles.historyStatusText, { color: historyStatusColor }]}>
                            {APPLICATION_STATUS[h.status as keyof typeof APPLICATION_STATUS] || h.status}
                          </Text>
                        </View>
                        <Text style={styles.historyTime}>
                          {new Date(h.updatedAt).toLocaleString("vi-VN")}
                        </Text>
                        <Text style={styles.historyBy}>
                          Bởi: {h.updatedBy?.email || h.updatedBy?.email || "Hệ thống"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="document-outline" size={32} color={COLORS.gray[300]} />
                <Text style={styles.emptyHistoryText}>Chưa có lịch sử xử lý</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
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
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  candidateEmail: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  statusBadgeLargeText: {
    fontSize: 15,
    fontWeight: '700',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { 
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.gray[800],
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10',
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
  viewCvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  viewCvBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
    gap: 6,
    minWidth: '47%',
  },
  statusActionBtnText: {
    fontSize: 13,
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineDotContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.gray[200],
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  historyStatusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 6,
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 13,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  historyBy: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: COLORS.gray[400],
    marginTop: 8,
  },
});

export default HrApplicationDetailScreen;
