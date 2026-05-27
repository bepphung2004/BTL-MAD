import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { COLORS } from '../../../constants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { mailService } from '../../../services/mailService';
import { useAppSelector } from '@/store/hooks';

const InterviewInviteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, job, company, email } = (route.params as any) || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hrEmail = useAppSelector((state) => state.auth.user?.email);
  const [content, setContent] = useState(() => {
    return `Kính gửi ${user?.name || 'ứng viên'},<br/><br/>Công ty <b>${company?.name || ''}</b> xin trân trọng mời bạn tham gia buổi phỏng vấn cho vị trí <b>${job?.name || ''}</b>.<br/><br/>Địa điểm: [Nhập địa chỉ phỏng vấn]<br/>Thời gian: [Nhập thời gian phỏng vấn]<br/><br/>Vui lòng phản hồi email: ${hrEmail} để xác nhận tham gia.<br/><br/>Trân trọng,<br/>${company?.name || ''}`;
  });
  const editor = useRef<RichEditor>(null);

  const handleSend = async () => {
    if (!content || !email) {
      setError('Vui lòng nhập đủ nội dung và email ứng viên');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await mailService.sendInterviewInvite({
        email,
        subject: `Thư mời phỏng vấn từ ${company?.name || ''}`,
        content,
      });
      Alert.alert('Thành công', 'Đã gửi thư mời phỏng vấn cho ứng viên!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Gửi mail thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipient Info Card */}
          <View style={styles.recipientCard}>
            <View style={styles.recipientHeader}>
              <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.recipientTitle}>Thông tin người nhận</Text>
            </View>
            <View style={styles.recipientInfo}>
              <View style={styles.recipientRow}>
                <Text style={styles.recipientLabel}>Ứng viên:</Text>
                <Text style={styles.recipientValue}>{user?.name || 'Chưa xác định'}</Text>
              </View>
              <View style={styles.recipientRow}>
                <Text style={styles.recipientLabel}>Email:</Text>
                <Text style={styles.recipientValue}>{email || 'Chưa có email'}</Text>
              </View>
              <View style={styles.recipientRow}>
                <Text style={styles.recipientLabel}>Vị trí:</Text>
                <Text style={styles.recipientValue}>{job?.name || 'Chưa xác định'}</Text>
              </View>
            </View>
          </View>

          {/* Email Content Card */}
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
              <Text style={styles.editorTitle}>Nội dung thư mời</Text>
            </View>
            
            <View style={styles.editorContainer}>
              <RichToolbar 
                editor={editor} 
                style={styles.richToolbar}
                iconSize={18}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.setUnderline,
                  actions.insertBulletsList,
                  actions.insertOrderedList,
                ]}
              />
              <RichEditor
                ref={editor}
                placeholder="Nhập nội dung thư mời..."
                style={styles.richEditor}
                initialHeight={280}
                initialContentHTML={content}
                onChange={setContent}
                editorStyle={{
                  backgroundColor: COLORS.white,
                  color: COLORS.gray[800],
                  placeholderColor: COLORS.gray[400],
                  contentCSSText: 'font-size: 14px; line-height: 22px; padding: 8px;',
                }}
              />
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.info} />
            <View style={styles.tipsContent}>
              <Text style={styles.tipsTitle}>Lưu ý khi gửi thư mời</Text>
              <Text style={styles.tipsText}>
                • Điền đầy đủ địa điểm và thời gian phỏng vấn{'\n'}
                • Cung cấp thông tin liên hệ rõ ràng{'\n'}
                • Gửi trước ít nhất 2-3 ngày
              </Text>
            </View>
          </View>

          {/* Send Button */}
          <Button
            title="Gửi thư mời phỏng vấn"
            onPress={handleSend}
            loading={loading}
            style={styles.sendButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  recipientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  recipientTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  recipientInfo: {
    gap: 12,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
    width: 80,
  },
  recipientValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[800],
  },
  editorCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.gray[400],
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  editorContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    overflow: 'hidden',
  },
  richEditor: {
    minHeight: 280,
    backgroundColor: COLORS.white,
  },
  richToolbar: {
    backgroundColor: COLORS.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 14,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.info,
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  sendButton: {
    marginTop: 8,
  },
});

export default InterviewInviteScreen;
