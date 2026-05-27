import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { IComment } from '../../types';
import { commentService } from '../../services/commentService';

interface CommentItemProps {
  comment: IComment;
  currentUserId?: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onReplySuccess?: () => void;
  level?: number;
  setChildCommentsFromParent?: React.Dispatch<React.SetStateAction<IComment[]>>;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReplySuccess,
  level = 0,
  setChildCommentsFromParent,
}) => {
  const [childComments, setChildComments] = useState<IComment[]>([]);
  const [totalChildComments, setTotalChildComments] = useState<number>(0);
  const [isAnswer, setIsAnswer] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [current, setCurrent] = useState<number>(1);

  const user = typeof comment.user === 'object' ? comment.user : null;
  const isOwner = currentUserId && user?._id === currentUserId;

  // Tính số lượng child comments còn lại chưa load
  const remainingChildren = Math.floor((comment.right - comment.left - 1) / 2) - totalChildComments;

  const handleReply = async () => {
    if (commentLoading) return;
    if (!replyContent.trim()) return;

    setCommentLoading(true);
    try {
      await onReply(comment._id, replyContent.trim());
      // Refresh children sau khi reply thành công
      const response = await commentService.getCommentsByParent(comment._id, 1, 10);
      if (response.data?.result) {
        const newChildren = response.data.result;
        setChildComments(newChildren);
        // Tính lại totalChildComments
        const total = newChildren.reduce((acc: number, cur: IComment) => {
          return acc + Math.floor((cur.right - cur.left - 1) / 2) + 1;
        }, 0);
        setTotalChildComments(total);
      }
      setReplyContent('');
      setIsAnswer(false);
    } catch (error) {
      console.error('Failed to reply:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const fetchChildComments = async () => {
    setLoading(true);
    try {
      const response = await commentService.getCommentsByParent(comment._id, current, 5);
      if (response.data?.result) {
        const newChildren = response.data.result as IComment[];
        setChildComments((prev) => [...prev, ...newChildren]);
        setCurrent((prev) => prev + 1);
        
        // Tính số lượng children đã load (bao gồm cả nested children)
        const total = newChildren.reduce((acc: number, cur: IComment) => {
          return acc + Math.floor((cur.right - cur.left - 1) / 2) + 1;
        }, 0);
        setTotalChildComments((prev) => prev + total);
      }
    } catch (error) {
      console.error('Failed to load child comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa bình luận',
      'Bạn có chắc chắn muốn xóa bình luận này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            onDelete?.(comment._id);
            // Nếu là child comment, xóa khỏi parent
            if (setChildCommentsFromParent) {
              setChildCommentsFromParent((prev) => 
                prev.filter((item) => item._id !== comment._id)
              );
            }
          },
        },
      ]
    );
  };

  // marginLeft: giới hạn tối đa level 2, từ level 3 trở đi vẫn giữ indent như level 2
  const displayLevel = level >= 2 ? 2 : level;
  const marginLeft = displayLevel * 24;

  return (
    <View style={[styles.container, { marginLeft }]}>
      <View style={styles.commentBox}>
        <View style={styles.header}>
          <View style={[styles.avatar, { width: Math.max(32 - level * 4, 24), height: Math.max(32 - level * 4, 24) }]}>
            <Text style={[styles.avatarText, { fontSize: Math.max(14 - level * 2, 10) }]}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Người dùng'}</Text>
            <Text style={styles.date}>
              {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
          {isOwner && (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => onEdit?.(comment._id, comment.content)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil-outline" size={16} color={COLORS.gray[500]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.content}>{comment.content}</Text>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => setIsAnswer(!isAnswer)}
          >
            <Ionicons name="return-down-forward-outline" size={16} color={COLORS.primary} />
            <Text style={styles.replyText}>Trả lời</Text>
          </TouchableOpacity>
        </View>

        {isAnswer && (
          <View style={styles.replyInput}>
            <TextInput
              style={styles.input}
              placeholder="Viết phản hồi..."
              value={replyContent}
              onChangeText={setReplyContent}
              multiline
              editable={!commentLoading}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleReply}
              disabled={!replyContent.trim() || commentLoading}
            >
              {commentLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={replyContent.trim() ? COLORS.primary : COLORS.gray[400]}
                />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {childComments.map((childComment) => (
        <CommentItem
          key={childComment._id}
          comment={childComment}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          level={level + 1}
          setChildCommentsFromParent={setChildComments}
        />
      ))}

      {remainingChildren > 0 && !loading && (
        <TouchableOpacity style={styles.loadMoreButton} onPress={fetchChildComments}>
          <Text style={styles.loadMoreText}>
            Xem thêm {remainingChildren} phản hồi
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  commentBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gray[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  date: {
    fontSize: 12,
    color: COLORS.gray[400],
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  content: {
    fontSize: SIZES.md,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 16,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  replyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    paddingTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: SIZES.sm,
    maxHeight: 80,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadMoreButton: {
    paddingVertical: 8,
    paddingLeft: 10,
  },
  loadMoreText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
