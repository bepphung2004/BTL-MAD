import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { useAppSelector } from '../../store/hooks';
import { subscriberService } from '../../services/subscriberService';
import { skillService } from '../../services/skillService';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ISkill, ISubscriber } from '../../types';

type JobSubscriptionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JobSubscription'>;
};

const JobSubscriptionScreen: React.FC<JobSubscriptionScreenProps> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<ISubscriber | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<ISkill[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Skills search
  const [allSkills, setAllSkills] = useState<ISkill[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<ISkill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [newSkillNames, setNewSkillNames] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subscriptionRes, skillsRes] = await Promise.all([
        subscriberService.getMySubscription(),
        skillService.getSkills(),
      ]);

      if (subscriptionRes.data) {
        setSubscription(subscriptionRes.data);
        setEmail(subscriptionRes.data.email);
        setSelectedSkills(subscriptionRes.data.skills || []);
        setIsActive(subscriptionRes.data.isActive);
      } else {
        setEmail(user?.email || '');
      }

      if (skillsRes.data?.result) {
        const skills = skillsRes.data.result;
        setAllSkills(skills);
        setFilteredSkills(skills);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setFilteredSkills(allSkills);
      } else {
        const filtered = allSkills.filter((skill) =>
          skill.name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredSkills(filtered);
      }
    },
    [allSkills]
  );

  const handleSelectSkill = (skill: ISkill) => {
    const isSelected = selectedSkills.some((s) => s._id === skill._id);
    if (isSelected) {
      setSelectedSkills(selectedSkills.filter((s) => s._id !== skill._id));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleAddNewSkill = () => {
    const trimmedQuery = searchQuery.trim().toUpperCase();
    if (!trimmedQuery) return;

    // Check if skill already exists
    const exists = allSkills.some((s) => s.name === trimmedQuery);
    const alreadyAdded = newSkillNames.includes(trimmedQuery);

    if (exists || alreadyAdded) {
      Alert.alert('Thông báo', 'Skill này đã tồn tại');
      return;
    }

    setNewSkillNames([...newSkillNames, trimmedQuery]);
    setSearchQuery('');
    Alert.alert('Thành công', `Skill "${trimmedQuery}" sẽ được tạo khi bạn lưu`);
  };

  const handleRemoveNewSkill = (skillName: string) => {
    setNewSkillNames(newSkillNames.filter((s) => s !== skillName));
  };

  const handleSave = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    if (selectedSkills.length === 0 && newSkillNames.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một skill');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }

    try {
      setSaving(true);
      await subscriberService.createOrUpdate({
        email: email.trim(),
        skills: selectedSkills.map((s) => s._id),
        newSkillNames: newSkillNames.length > 0 ? newSkillNames : undefined,
        isActive,
      });

      Alert.alert('Thành công', 'Đã lưu cài đặt đăng ký nhận tin tuyển dụng', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!subscription) {
      setIsActive(!isActive);
      return;
    }

    try {
      const response = await subscriberService.toggleActive(subscription._id);
      setIsActive(response.data.isActive);
      Alert.alert(
        'Thành công',
        response.data.isActive
          ? 'Đã bật nhận thông báo việc làm'
          : 'Đã tắt nhận thông báo việc làm'
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể thay đổi trạng thái');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng ký nhận tin tuyển dụng</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={styles.descriptionCard}>
          <Ionicons name="mail-outline" size={32} color={COLORS.primary} />
          <Text style={styles.descriptionText}>
            Nhận email thông báo về các tin tuyển dụng mới phù hợp với kỹ năng của bạn
          </Text>
        </View>

        {/* Active Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleContent}>
              <Text style={styles.label}>Nhận thông báo</Text>
              <Text style={styles.sublabel}>
                {isActive ? 'Đang bật' : 'Đang tắt'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={handleToggleActive}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary + '80' }}
              thumbColor={isActive ? COLORS.primary : COLORS.gray[100]}
            />
          </View>
        </View>

        {/* Email Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Email nhận thông báo</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Nhập email của bạn"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Skills Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Kỹ năng quan tâm</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowSkillsModal(true)}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>Thêm</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Skills */}
          {selectedSkills.length > 0 || newSkillNames.length > 0 ? (
            <View style={styles.skillsContainer}>
              {selectedSkills.map((skill) => (
                <View key={skill._id} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleSelectSkill(skill)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
              {newSkillNames.map((skillName) => (
                <View key={skillName} style={[styles.skillChip, styles.newSkillChip]}>
                  <Text style={[styles.skillChipText, styles.newSkillChipText]}>{skillName}</Text>
                  <Text style={styles.newBadge}>MỚI</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveNewSkill(skillName)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={16} color={COLORS.success} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Chưa chọn kỹ năng nào</Text>
          )}
        </View>

        {/* Last Email Sent */}
        {subscription?.lastEmailSentAt && (
          <View style={styles.infoSection}>
            <Ionicons name="time-outline" size={18} color={COLORS.gray[500]} />
            <Text style={styles.infoText}>
              Email cuối cùng:{' '}
              {new Date(subscription.lastEmailSentAt).toLocaleString('vi-VN')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Lưu cài đặt</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Skills Modal */}
      <Modal
        visible={showSkillsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSkillsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn kỹ năng</Text>
            <TouchableOpacity onPress={() => setShowSkillsModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray[400]} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Tìm hoặc thêm skill mới..."
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Add New Skill Button */}
          {searchQuery.trim() &&
            !allSkills.some(
              (s) => s.name.toLowerCase() === searchQuery.trim().toLowerCase()
            ) && (
              <TouchableOpacity style={styles.addNewSkillButton} onPress={handleAddNewSkill}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.success} />
                <Text style={styles.addNewSkillText}>
                  Tạo skill mới: "{searchQuery.trim().toUpperCase()}"
                </Text>
              </TouchableOpacity>
            )}

          {/* Skills List */}
          <FlatList
            data={filteredSkills}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => {
              const isSelected = selectedSkills.some((s) => s._id === item._id);
              return (
                <TouchableOpacity
                  style={[styles.skillItem, isSelected && styles.skillItemSelected]}
                  onPress={() => handleSelectSkill(item)}
                >
                  <Text
                    style={[
                      styles.skillItemText,
                      isSelected && styles.skillItemTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Không tìm thấy skill</Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.modalDoneButton}
            onPress={() => setShowSkillsModal(false)}
          >
            <Text style={styles.modalDoneButtonText}>
              Xong ({selectedSkills.length + newSkillNames.length} đã chọn)
            </Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray[600],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray[700],
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
  },
  toggleContent: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  skillChipText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  newSkillChip: {
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  newSkillChipText: {
    color: COLORS.success,
  },
  newBadge: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyText: {
    color: COLORS.gray[500],
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: COLORS.gray[800],
  },
  addNewSkillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  addNewSkillText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  skillItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  skillItemText: {
    fontSize: 15,
    color: COLORS.gray[700],
  },
  skillItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalDoneButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default JobSubscriptionScreen;
