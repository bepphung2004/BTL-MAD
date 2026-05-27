import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { Button, Loading, JobCard, CommentItem } from '../../components';
import RenderHTML from 'react-native-render-html';
import { companyService } from '../../services/companyService';
import { jobService } from '../../services/jobService';
import { commentService } from '../../services/commentService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { followCompany, unfollowCompany } from '../../store/slices/companySlice';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ICompany, IJob, IComment } from '../../types';

type CompanyDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CompanyDetail'>;
  route: RouteProp<RootStackParamList, 'CompanyDetail'>;
};

const CompanyDetailScreen: React.FC<CompanyDetailScreenProps> = ({ navigation, route }) => {
  const { companyId } = route.params;
  const dispatch = useAppDispatch();
  const { followedCompanies } = useAppSelector((state) => state.companies);
  const { user } = useAppSelector((state) => state.auth);

  const [company, setCompany] = useState<ICompany | null>(null);
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'jobs' | 'comments'>('info');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const { width } = useWindowDimensions();

  const isFollowing = followedCompanies.includes(companyId);

  useEffect(() => {
    loadCompanyData();
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      const [companyRes, jobsRes, commentsRes] = await Promise.all([
        companyService.getCompanyById(companyId),
        jobService.getJobsByCompany(companyId, { current: 1, pageSize: 10 }),
        commentService.getCommentsByCompany(companyId),
      ]);
      setCompany(companyRes.data);
      setJobs(jobsRes.data.result || []);
      setComments(commentsRes.data.result || []);
    } catch (error) {
      console.error('Failed to load company:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin công ty');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = () => {
    if (isFollowing) {
      dispatch(unfollowCompany(companyId));
    } else {
      dispatch(followCompany(companyId));
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await commentService.createComment({
        content: newComment.trim(),
        companyId: companyId,
      });
      setNewComment('');
      // Reload comments
      const commentsRes = await commentService.getCommentsByCompany(companyId);
      setComments(commentsRes.data.result || []);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể thêm bình luận');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyComment = async (parentId: string, content: string) => {
    await commentService.createComment({
      content,
      companyId: companyId,
      parentId: parentId,
    });
    // Không cần reload ở đây vì CommentItem tự refresh children
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      // Reload comments
      const commentsRes = await commentService.getCommentsByCompany(companyId);
      setComments(commentsRes.data.result || []);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa bình luận');
    }
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải..." />;
  }

  if (!company) {
    return null;
  }

  const renderInfoTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giới thiệu</Text>
        {company.description ? (
          <RenderHTML
            contentWidth={width - 2 * SIZES.padding}
            source={{ html: company.description }}
            baseStyle={styles.description}
            tagsStyles={{
              p: { marginBottom: 8 },
              h1: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
              h2: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
            }}
          />
        ) : (
          <Text style={styles.description}>Không có mô tả</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
        <View style={styles.contactItem}>
          <Ionicons name="location-outline" size={20} color={COLORS.gray[500]} />
          <Text style={styles.contactText}>{company.address}</Text>
        </View>
      </View>
    </View>
  );

  const renderJobsTab = () => (
    <View style={styles.tabContent}>
      {jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có việc làm nào</Text>
        </View>
      ) : (
        jobs.map((job) => (
          <JobCard
            key={job._id}
            job={job}
            onPress={() => navigation.navigate('JobDetail', { jobId: job._id })}
          />
        ))
      )}
    </View>
  );

  const renderCommentsTab = () => (
    <View style={styles.tabContent}>
      {/* Add Comment */}
      <View style={styles.addCommentContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Viết đánh giá của bạn..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleAddComment}
          disabled={!newComment.trim() || submittingComment}
        >
          <Ionicons
            name="send"
            size={20}
            color={newComment.trim() ? COLORS.primary : COLORS.gray[400]}
          />
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
        </View>
      ) : (
        comments.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            currentUserId={user?._id}
            onReply={handleReplyComment}
            onDelete={handleDeleteComment}
            level={0}
          />
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Company Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: company.logo || 'https://via.placeholder.com/100' }}
            style={styles.logo}
          />
          <Text style={styles.companyName}>{company.name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{jobs.length}</Text>
              <Text style={styles.statLabel}>Việc làm</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{comments.length}</Text>
              <Text style={styles.statLabel}>Đánh giá</Text>
            </View>
          </View>
          <Button
            title={isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
            variant={isFollowing ? 'secondary' : 'primary'}
            onPress={handleFollow}
            icon={
              <Ionicons
                name={isFollowing ? 'heart' : 'heart-outline'}
                size={18}
                color={COLORS.white}
              />
            }
            style={styles.followButton}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'info', label: 'Thông tin' },
            { key: 'jobs', label: `Việc làm (${jobs.length})` },
            { key: 'comments', label: `Đánh giá (${comments.length})` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'jobs' && renderJobsTab()}
        {activeTab === 'comments' && renderCommentsTab()}
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
    padding: SIZES.padding * 1.5,
    backgroundColor: COLORS.white,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.gray[100],
    marginBottom: 16,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  followButton: {
    minWidth: 150,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    padding: SIZES.padding,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 12,
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.gray[700],
    lineHeight: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: SIZES.md,
    color: COLORS.gray[600],
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.gray[800],
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default CompanyDetailScreen;
