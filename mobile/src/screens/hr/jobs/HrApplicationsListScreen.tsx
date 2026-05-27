import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APPLICATION_STATUS, COLORS } from "../../../constants";
import { applicationService } from "../../../services/applicationService";
import { useNavigation, useRoute } from "@react-navigation/native";
import { IApplication, ICandidateMatchResult, ICVSearchResultItem } from "../../../types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";


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
    HrApplicationsList: { jobId: string };
    HrApplicationDetail: { applicationId: string };
};

const StatusFilter = ({ 
  status, 
  setStatus, 
  counts 
}: { 
  status: string | undefined; 
  setStatus: (s: string | undefined) => void;
  counts: Record<string, number>;
}) => (
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false}
    style={styles.filterScrollView}
    contentContainerStyle={styles.filterRow}
  >
    <TouchableOpacity
      style={[
        styles.filterChip,
        !status && styles.filterChipActive,
      ]}
      onPress={() => setStatus(undefined)}
    >
      <Text style={[
        styles.filterChipText,
        !status && styles.filterChipTextActive
      ]}>
        {`Tất cả (${counts.ALL || 0})`}
      </Text>
    </TouchableOpacity>
    {(Object.keys(APPLICATION_STATUS) as Array<keyof typeof APPLICATION_STATUS>).map((key) => (
      <TouchableOpacity
        key={key}
        style={[
          styles.filterChip,
          status === key && { backgroundColor: STATUS_COLORS[key] + '22', borderColor: STATUS_COLORS[key] },
        ]}
        onPress={() => setStatus(key)}
      >
        <View style={[styles.filterDot, { backgroundColor: STATUS_COLORS[key] }]} />
        <Text style={[
          styles.filterChipText,
          status === key && { color: STATUS_COLORS[key], fontWeight: '600' }
        ]}>
          {`${APPLICATION_STATUS[key]} (${counts[key] || 0})`}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// AI Candidate Card Component
const AICandidateCard = ({ 
  candidate, 
  onPress,
  rank
}: { 
  candidate: ICandidateMatchResult; 
  onPress: () => void;
  rank: number;
}) => {
  const scorePercent = Math.round(candidate.matchScore * 100);
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return COLORS.success;
    if (score >= 0.5) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <TouchableOpacity style={styles.aiCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rankBadgeInline}>
        <Ionicons name="trophy" size={12} color={COLORS.white} />
        <Text style={styles.rankText}>#{rank}</Text>
      </View>

      <View style={styles.aiCardHeader}>
        <View style={styles.aiCandidateInfo}>
          {candidate.candidateAvatar ? (
            <Image source={{ uri: candidate.candidateAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {candidate.candidateName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.aiCandidateText}>
            <Text style={styles.aiCandidateName}>{candidate.candidateName}</Text>
            <Text style={styles.aiCandidateEmail}>{candidate.candidateEmail}</Text>
          </View>
        </View>
        <View style={[styles.scoreCircle, { borderColor: getScoreColor(candidate.matchScore) }]}>
          <Text style={[styles.scoreText, { color: getScoreColor(candidate.matchScore) }]}>
            {scorePercent}%
          </Text>
          <Text style={styles.scoreLabel}>phù hợp</Text>
        </View>
      </View>

      <View style={styles.aiExplanationBox}>
        <Ionicons name="sparkles" size={14} color={COLORS.primary} style={{ marginTop: 2 }} />
        <Text style={styles.aiExplanation}>{candidate.shortExplanation}</Text>
      </View>

      {candidate.matchedSkills.length > 0 && (
        <View style={styles.skillsRow}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} style={{ marginTop: 2 }} />
          <View style={styles.skillTags}>
            {candidate.matchedSkills.slice(0, 4).map((skill, idx) => (
              <View key={idx} style={[styles.skillTag, styles.matchedSkill]}>
                <Text style={styles.matchedSkillText}>{skill}</Text>
              </View>
            ))}
            {candidate.matchedSkills.length > 4 && (
              <Text style={styles.moreSkills}>+{candidate.matchedSkills.length - 4}</Text>
            )}
          </View>
        </View>
      )}

      {candidate.missingSkills.length > 0 && (
        <View style={styles.skillsRow}>
          <Ionicons name="close-circle" size={14} color={COLORS.danger} style={{ marginTop: 2 }} />
          <View style={styles.skillTags}>
            {candidate.missingSkills.slice(0, 3).map((skill, idx) => (
              <View key={idx} style={[styles.skillTag, styles.missingSkill]}>
                <Text style={styles.missingSkillText}>{skill}</Text>
              </View>
            ))}
            {candidate.missingSkills.length > 3 && (
              <Text style={styles.moreSkills}>+{candidate.missingSkills.length - 3}</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.aiCardFooter}>
        <View style={styles.aiCardMetaRow}>
          <Ionicons name="document-text-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.aiCardMeta}>{candidate.cvTitle}</Text>
        </View>
        <View style={[
          styles.aiStatusBadge,
          { backgroundColor: (STATUS_COLORS[candidate.applicationStatus] || COLORS.gray[500]) + '15' }
        ]}>
          <Text style={[
            styles.aiCardStatus, 
            { color: STATUS_COLORS[candidate.applicationStatus] || COLORS.gray[600] }
          ]}>
            {APPLICATION_STATUS[candidate.applicationStatus as keyof typeof APPLICATION_STATUS] || candidate.applicationStatus}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const HrApplicationsListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HrStackParamList, 'HrApplicationsList'>>();
  const route = useRoute();
  const { jobId } = route.params as HrStackParamList["HrApplicationsList"];
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [applications, setApplications] = useState<IApplication[]>([]);
  const [allApplications, setAllApplications] = useState<IApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI Ranking states
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCandidates, setAiCandidates] = useState<ICandidateMatchResult[]>([]);
  const [aiJobName, setAiJobName] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  // CV Search states
  const [cvSearchModalVisible, setCvSearchModalVisible] = useState(false);
  const [cvSearchLoading, setCvSearchLoading] = useState(false);
  const [cvSearchResults, setCvSearchResults] = useState<ICVSearchResultItem[]>([]);
  const [cvSearchActive, setCvSearchActive] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [educationInput, setEducationInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [certTags, setCertTags] = useState<string[]>([]);

  // Calculate status counts
  const getStatusCounts = () => {
    const counts: Record<string, number> = { ALL: allApplications.length };
    allApplications.forEach(app => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });
    return counts;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await applicationService.getApplicationsByJob(jobId, {});
      const all = res.data.result || [];
      setAllApplications(all);
      setApplications(status ? all.filter((a: IApplication) => a.status === status) : all);
    } catch {
      setApplications([]);
      setAllApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Load AI ranked candidates
  const loadAIRanking = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await applicationService.getAIRankedCandidates(jobId, 10);
      setAiCandidates(res.data.rankedCandidates || []);
      setAiJobName(res.data.jobName || '');
      setAiModalVisible(true);
    } catch (error: any) {
      setAiError(error?.message || 'Không thể xếp hạng ứng viên bằng AI');
      setAiModalVisible(true);
    } finally {
      setAiLoading(false);
    }
  };

  // Add skill tag
  const addSkillTag = useCallback(() => {
    const tag = skillInput.trim();
    if (tag && !skillTags.includes(tag)) {
      setSkillTags(prev => [...prev, tag]);
    }
    setSkillInput('');
  }, [skillInput, skillTags]);

  // Remove skill tag
  const removeSkillTag = useCallback((tag: string) => {
    setSkillTags(prev => prev.filter(t => t !== tag));
  }, []);

  // Add certificate tag
  const addCertTag = useCallback(() => {
    const tag = certInput.trim();
    if (tag && !certTags.includes(tag)) {
      setCertTags(prev => [...prev, tag]);
    }
    setCertInput('');
  }, [certInput, certTags]);

  // Remove certificate tag
  const removeCertTag = useCallback((tag: string) => {
    setCertTags(prev => prev.filter(t => t !== tag));
  }, []);

  // Execute CV search
  const executeCvSearch = async () => {
    if (skillTags.length === 0 && !educationInput.trim() && !addressInput.trim() && certTags.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập ít nhất một tiêu chí tìm kiếm');
      return;
    }

    setCvSearchLoading(true);
    try {
      const res = await applicationService.searchApplicationsByCV(jobId, {
        skills: skillTags.length > 0 ? skillTags.join(',') : undefined,
        education: educationInput.trim() || undefined,
        address: addressInput.trim() || undefined,
        certificates: certTags.length > 0 ? certTags.join(',') : undefined,
      });
      setCvSearchResults(res.data.result || []);
      setCvSearchActive(true);
      setCvSearchModalVisible(false);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể tìm kiếm');
    } finally {
      setCvSearchLoading(false);
    }
  };

  // Clear CV search
  const clearCvSearch = useCallback(() => {
    setCvSearchActive(false);
    setCvSearchResults([]);
    setSkillTags([]);
    setEducationInput('');
    setAddressInput('');
    setCertTags([]);
  }, []);

  useEffect(() => {
    load();
  }, [jobId]);

  useEffect(() => {
    const filtered = status 
      ? allApplications.filter(a => a.status === status) 
      : allApplications;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setApplications(filtered.filter(app => {
        const user = typeof app.userId === 'object' && app.userId !== null ? app.userId : undefined;
        return user?.name?.toLowerCase().includes(q) || user?.email?.toLowerCase().includes(q);
      }));
    } else {
      setApplications(filtered);
    }
  }, [status, allApplications, searchQuery]);

  const statusCounts = getStatusCounts();

  const renderItem = ({ item }: { item: IApplication | ICVSearchResultItem }) => {
    const user = typeof item.userId === 'object' && item.userId !== null ? item.userId : undefined;
    const cv = typeof item.cvId === 'object' && item.cvId !== null ? item.cvId : undefined;
    const statusColor = STATUS_COLORS[item.status] || COLORS.gray[500];
    const statusIcon = STATUS_ICONS[item.status] || 'help-circle-outline';
    const matchInfo = (item as ICVSearchResultItem).matchInfo;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("HrApplicationDetail", { applicationId: item._id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Avatar */}
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.candidateAvatar} />
          ) : (
            <View style={styles.candidateAvatarPlaceholder}>
              <Text style={styles.candidateAvatarText}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{user?.name || "Ứng viên ẩn danh"}</Text>
            <Text style={styles.cardEmail} numberOfLines={1}>{user?.email || ''}</Text>
            <View style={styles.cardMetaRow}>
              <Ionicons name="document-text-outline" size={12} color={COLORS.gray[400]} />
              <Text style={styles.cardMeta}>{cv?.title || "CV"}</Text>
            </View>
            <View style={styles.cardMetaRow}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.gray[400]} />
              <Text style={styles.cardMeta}>
                {new Date(item.createdAt).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          </View>

          {/* Status */}
          <View style={styles.cardStatus}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Ionicons name={statusIcon} size={14} color={statusColor} />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {APPLICATION_STATUS[item.status as keyof typeof APPLICATION_STATUS]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} style={{ marginTop: 8 }} />
          </View>
        </View>

        {/* Match Info (CV Search mode) */}
        {matchInfo && (
          <View style={styles.matchInfoContainer}>
            {matchInfo.matchedSkills.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                <Text style={styles.matchLabel}>Skills:</Text>
                <View style={styles.matchTagsRow}>
                  {matchInfo.matchedSkills.map((skill, idx) => (
                    <View key={idx} style={styles.matchTag}>
                      <Text style={styles.matchTagText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {matchInfo.matchedEducation.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons name="school" size={13} color={COLORS.info} />
                <Text style={styles.matchLabel}>Education:</Text>
                <View style={styles.matchTagsRow}>
                  {matchInfo.matchedEducation.map((edu, idx) => (
                    <View key={idx} style={styles.matchEduTag}>
                      <Text style={styles.matchEduTagText} numberOfLines={1}>{edu}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {matchInfo.matchedAddress && (
              <View style={styles.matchRow}>
                <Ionicons name="location" size={13} color={COLORS.primary} />
                <Text style={styles.matchLabel}>Địa chỉ:</Text>
                <View style={styles.matchTagsRow}>
                  <View style={styles.matchAddressTag}>
                    <Text style={styles.matchAddressTagText}>Phù hợp</Text>
                  </View>
                </View>
              </View>
            )}
            {matchInfo.matchedCertificates && matchInfo.matchedCertificates.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons name="ribbon" size={13} color="#8b5cf6" />
                <Text style={styles.matchLabel}>Chứng chỉ:</Text>
                <View style={styles.matchTagsRow}>
                  {matchInfo.matchedCertificates.map((cert, idx) => (
                    <View key={idx} style={styles.matchCertTag}>
                      <Text style={styles.matchCertTagText} numberOfLines={1}>{cert}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {matchInfo.matchedInParsedText && matchInfo.matchedSkills.length === 0 && matchInfo.matchedEducation.length === 0 && !matchInfo.matchedAddress && (!matchInfo.matchedCertificates || matchInfo.matchedCertificates.length === 0) && (
              <View style={styles.matchRow}>
                <Ionicons name="document-text-outline" size={13} color={COLORS.warning} />
                <Text style={styles.matchParsedText}>Ứng viên có CV phù hợp với tiêu chí tìm kiếm</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh sách ứng viên</Text>
        <Text style={styles.headerSubtitle}>{allApplications.length} ứng viên đã ứng tuyển</Text>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        {/* AI Button */}
        <TouchableOpacity 
          style={styles.aiButton}
          onPress={loadAIRanking}
          disabled={aiLoading}
          activeOpacity={0.8}
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={COLORS.white} />
              <Text style={styles.aiButtonText}>AI xếp hạng</Text>
            </>
          )}
        </TouchableOpacity>

        {/* CV Search Button */}
        <TouchableOpacity 
          style={[styles.cvSearchButton, cvSearchActive && styles.cvSearchButtonActive]}
          onPress={() => setCvSearchModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={18} color={cvSearchActive ? COLORS.white : COLORS.primary} />
          <Text style={[styles.cvSearchButtonText, cvSearchActive && styles.cvSearchButtonTextActive]}>
            Tìm theo CV
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active CV Search Banner */}
      {cvSearchActive && (
        <View style={styles.cvSearchBanner}>
          <View style={styles.cvSearchBannerLeft}>
            <Ionicons name="filter" size={16} color={COLORS.primary} />
            <Text style={styles.cvSearchBannerText}>
              {cvSearchResults.length} kết quả
              {skillTags.length > 0 ? ` | Skills: ${skillTags.join(', ')}` : ''}
              {educationInput.trim() ? ` | Education: ${educationInput.trim()}` : ''}
              {addressInput.trim() ? ` | Địa chỉ: ${addressInput.trim()}` : ''}
              {certTags.length > 0 ? ` | Chứng chỉ: ${certTags.join(', ')}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={clearCvSearch} style={styles.cvSearchBannerClose}>
            <Ionicons name="close-circle" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      {!cvSearchActive && (
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, email..."
            placeholderTextColor={COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Status Filter */}
      {!cvSearchActive && (
        <StatusFilter status={status} setStatus={setStatus} counts={statusCounts} />
      )}

      {/* List */}
      {loading && applications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={cvSearchActive ? cvSearchResults : applications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, (cvSearchActive ? cvSearchResults : applications).length === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>Không có ứng viên</Text>
              {status ? (
                <TouchableOpacity onPress={() => setStatus(undefined)}>
                  <Text style={styles.emptyAction}>Xem tất cả ứng viên</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}

      {/* AI Ranking Modal */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <View style={styles.modalTitleRow}>
                <Ionicons name="sparkles" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Top ứng viên phù hợp nhất</Text>
              </View>
              {aiJobName ? (
                <Text style={styles.modalSubtitle}>Vị trí: {aiJobName}</Text>
              ) : null}
            </View>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setAiModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          {aiError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
              <Text style={styles.errorText}>{aiError}</Text>
            </View>
          ) : aiCandidates.length === 0 ? (
            <View style={styles.emptyAiContainer}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyAiText}>
                Không có ứng viên nào hoặc không thể phân tích CV.
              </Text>
              <Text style={styles.emptyAiHint}>
                Đảm bảo CV được upload dạng ảnh (JPG, PNG, WebP)
              </Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.aiResultsInfo}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.gray[500]} />
                <Text style={styles.aiResultsInfoText}>
                  AI đã phân tích CV và đánh giá mức độ phù hợp với yêu cầu công việc
                </Text>
              </View>
              {aiCandidates.map((candidate, index) => (
                <AICandidateCard
                  key={candidate.applicationId}
                  candidate={candidate}
                  rank={index + 1}
                  onPress={() => {
                    setAiModalVisible(false);
                    navigation.navigate("HrApplicationDetail", { 
                      applicationId: candidate.applicationId 
                    });
                  }}
                />
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* CV Search Modal */}
      <Modal
        visible={cvSearchModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCvSearchModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <View style={styles.modalTitleRow}>
                <Ionicons name="search" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Tìm kiếm theo CV</Text>
              </View>
              <Text style={styles.modalSubtitle}>Tìm ứng viên theo nhiều tiêu chí</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setCvSearchModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalScroll}
            contentContainerStyle={styles.cvSearchModalContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Skills Section */}
            <View style={styles.cvSearchSection}>
              <View style={styles.cvSearchSectionHeader}>
                <Ionicons name="code-slash" size={18} color={COLORS.primary} />
                <Text style={styles.cvSearchSectionTitle}>Kỹ năng (Skills)</Text>
              </View>
              <Text style={styles.cvSearchHint}>
                Nhập từng kỹ năng và nhấn "Thêm" hoặc Enter
              </Text>

              <View style={styles.skillInputRow}>
                <TextInput
                  style={styles.skillInputField}
                  placeholder="VD: React, Python, Java..."
                  placeholderTextColor={COLORS.gray[400]}
                  value={skillInput}
                  onChangeText={setSkillInput}
                  onSubmitEditing={addSkillTag}
                  returnKeyType="done"
                />
                <TouchableOpacity 
                  style={[styles.addSkillBtn, !skillInput.trim() && styles.addSkillBtnDisabled]}
                  onPress={addSkillTag}
                  disabled={!skillInput.trim()}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {skillTags.length > 0 && (
                <View style={styles.skillTagsContainer}>
                  {skillTags.map((tag, idx) => (
                    <View key={idx} style={styles.searchSkillTag}>
                      <Text style={styles.searchSkillTagText}>{tag}</Text>
                      <TouchableOpacity onPress={() => removeSkillTag(tag)}>
                        <Ionicons name="close-circle" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Education Section */}
            <View style={styles.cvSearchSection}>
              <View style={styles.cvSearchSectionHeader}>
                <Ionicons name="school" size={18} color={COLORS.info} />
                <Text style={styles.cvSearchSectionTitle}>Học vấn (Education)</Text>
              </View>
              <Text style={styles.cvSearchHint}>
                Nhập từ khóa về trường học, chuyên ngành, bằng cấp...
              </Text>

              <TextInput
                style={styles.educationInputField}
                placeholder="VD: Đại học Bách Khoa, Computer Science..."
                placeholderTextColor={COLORS.gray[400]}
                value={educationInput}
                onChangeText={setEducationInput}
                multiline={false}
              />
            </View>

            {/* Address Section */}
            <View style={styles.cvSearchSection}>
              <View style={styles.cvSearchSectionHeader}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
                <Text style={styles.cvSearchSectionTitle}>Địa chỉ</Text>
              </View>
              <Text style={styles.cvSearchHint}>
                Nhập từ khóa về địa chỉ, thành phố, tỉnh...
              </Text>

              <TextInput
                style={styles.educationInputField}
                placeholder="VD: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                placeholderTextColor={COLORS.gray[400]}
                value={addressInput}
                onChangeText={setAddressInput}
                multiline={false}
              />
            </View>

            {/* Certificates Section */}
            <View style={styles.cvSearchSection}>
              <View style={styles.cvSearchSectionHeader}>
                <Ionicons name="ribbon" size={18} color="#8b5cf6" />
                <Text style={styles.cvSearchSectionTitle}>Chứng chỉ</Text>
              </View>
              <Text style={styles.cvSearchHint}>
                Nhập từng chứng chỉ và nhấn "Thêm" hoặc Enter
              </Text>

              <View style={styles.skillInputRow}>
                <TextInput
                  style={styles.skillInputField}
                  placeholder="VD: TOEIC, AWS, PMP..."
                  placeholderTextColor={COLORS.gray[400]}
                  value={certInput}
                  onChangeText={setCertInput}
                  onSubmitEditing={addCertTag}
                  returnKeyType="done"
                />
                <TouchableOpacity 
                  style={[styles.addSkillBtn, !certInput.trim() && styles.addSkillBtnDisabled, certInput.trim() ? { backgroundColor: '#8b5cf6' } : {}]}
                  onPress={addCertTag}
                  disabled={!certInput.trim()}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {certTags.length > 0 && (
                <View style={styles.skillTagsContainer}>
                  {certTags.map((tag, idx) => (
                    <View key={idx} style={styles.searchCertTag}>
                      <Text style={styles.searchCertTagText}>{tag}</Text>
                      <TouchableOpacity onPress={() => removeCertTag(tag)}>
                        <Ionicons name="close-circle" size={16} color="#8b5cf6" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Info box */}
            <View style={styles.cvSearchInfoBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.gray[500]} />
              <Text style={styles.cvSearchInfoText}>
                Tìm kiếm sẽ so khớp trong nội dung CV của ứng viên. Khi nhập nhiều tiêu chí, ứng viên phải thỏa mãn tất cả.
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.cvSearchActions}>
              <TouchableOpacity
                style={styles.cvSearchClearBtn}
                onPress={() => { setSkillTags([]); setEducationInput(''); setAddressInput(''); setCertTags([]); }}
              >
                <Text style={styles.cvSearchClearBtnText}>Xóa tất cả</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cvSearchSubmitBtn,
                  (skillTags.length === 0 && !educationInput.trim() && !addressInput.trim() && certTags.length === 0) && styles.cvSearchSubmitBtnDisabled,
                ]}
                onPress={executeCvSearch}
                disabled={cvSearchLoading || (skillTags.length === 0 && !educationInput.trim() && !addressInput.trim() && certTags.length === 0)}
              >
                {cvSearchLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="search" size={18} color={COLORS.white} />
                    <Text style={styles.cvSearchSubmitBtnText}>Tìm kiếm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.gray[800],
    padding: 0,
  },
  filterScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    gap: 4,
    height: 28,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.gray[600],
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  candidateAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  candidateAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  candidateAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.gray[800],
  },
  cardEmail: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  cardMeta: {
    color: COLORS.gray[500],
    fontSize: 12,
  },
  cardStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 12,
    color: COLORS.gray[500],
    fontSize: 15,
  },
  emptyAction: {
    marginTop: 8,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // AI Button styles
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    gap: 6,
  },
  aiButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 10,
  },
  cvSearchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: 6,
  },
  cvSearchButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cvSearchButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  cvSearchButtonTextActive: {
    color: COLORS.white,
  },
  cvSearchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '12',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  cvSearchBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  cvSearchBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  cvSearchBannerClose: {
    marginLeft: 8,
  },
  // Match info styles (on cards)
  matchInfoContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    gap: 6,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  matchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  matchTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  matchTag: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  matchTagText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  matchEduTag: {
    backgroundColor: COLORS.info + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    maxWidth: '70%',
  },
  matchEduTagText: {
    fontSize: 11,
    color: COLORS.info,
    fontWeight: '600',
  },
  matchParsedText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  matchAddressTag: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  matchAddressTagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  matchCertTag: {
    backgroundColor: '#8b5cf615',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    maxWidth: '70%',
  },
  matchCertTagText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  searchCertTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf615',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 20,
    gap: 4,
  },
  searchCertTagText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  // CV Search Modal styles
  cvSearchModalContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  cvSearchSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  cvSearchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cvSearchSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  cvSearchHint: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginBottom: 12,
  },
  skillInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.gray[800],
    backgroundColor: COLORS.gray[50],
  },
  addSkillBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSkillBtnDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  skillTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  searchSkillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 20,
    gap: 4,
  },
  searchSkillTagText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  educationInputField: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.gray[800],
    backgroundColor: COLORS.gray[50],
  },
  cvSearchInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.gray[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  cvSearchInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray[500],
    lineHeight: 18,
  },
  cvSearchActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cvSearchClearBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  cvSearchClearBtnText: {
    fontSize: 15,
    color: COLORS.gray[600],
    fontWeight: '600',
  },
  cvSearchSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  cvSearchSubmitBtnDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  cvSearchSubmitBtnText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '700',
  },
  // AI Card styles
  aiCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  rankBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
    gap: 4,
  },
  rankText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiCandidateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: COLORS.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  aiCandidateText: {
    flex: 1,
  },
  aiCandidateName: {
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.gray[800],
  },
  aiCandidateEmail: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  scoreText: {
    fontWeight: '800',
    fontSize: 14,
  },
  scoreLabel: {
    fontSize: 9,
    color: COLORS.gray[500],
  },
  aiExplanationBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '08',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  aiExplanation: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray[700],
    lineHeight: 18,
  },
  skillsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  skillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: 4,
  },
  skillTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  matchedSkill: {
    backgroundColor: COLORS.success + '15',
  },
  matchedSkillText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  missingSkill: {
    backgroundColor: COLORS.danger + '15',
  },
  missingSkillText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 3,
  },
  aiCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  aiCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiCardMeta: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  aiStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  aiCardStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  aiResultsInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.gray[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  aiResultsInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray[600],
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyAiContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyAiText: {
    color: COLORS.gray[500],
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyAiHint: {
    color: COLORS.gray[400],
    fontSize: 13,
    textAlign: 'center',
  },
});

export default HrApplicationsListScreen;
