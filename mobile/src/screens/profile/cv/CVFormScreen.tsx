import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../../constants';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { onlineCVService, CreateOnlineCVDto, IOnlineCV } from '../../../services/onlineCVService';
import { useAppSelector } from '../../../store/hooks';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CVFormScreen'>;
  route: RouteProp<RootStackParamList, 'CVFormScreen'>;
};

interface EducationEntry {
  schoolName: string;
  major: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface WorkExperienceEntry {
  companyName: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface SkillEntry {
  name: string;
  description: string;
}

interface ActivityEntry {
  organizationName: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface CertificateEntry {
  name: string;
  date: string;
}

interface AwardEntry {
  name: string;
  date: string;
}

const CVFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { templateType: routeTemplateType, cvId } = route.params || { templateType: 'template1' };
  const { user } = useAppSelector((state) => state.auth);
  
  // Use state for templateType so it can be updated from loaded CV data
  const [activeTemplateType, setActiveTemplateType] = useState(routeTemplateType || 'template1');
  const isTemplate1 = activeTemplateType === 'template1';
  
  // Form states
  const [fullName, setFullName] = useState(user?.name || '');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [link, setLink] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  const [careerObjective, setCareerObjective] = useState('');
  
  // Array fields
  const [education, setEducation] = useState<EducationEntry[]>([
    { schoolName: '', major: '', startDate: '', endDate: '', description: '' },
  ]);
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([
    { companyName: '', position: '', startDate: '', endDate: '', description: '' },
  ]);
  const [skills, setSkills] = useState<SkillEntry[]>([
    { name: '', description: '' },
  ]);
  const [activities, setActivities] = useState<ActivityEntry[]>([
    { organizationName: '', position: '', startDate: '', endDate: '', description: '' },
  ]);
  const [certificates, setCertificates] = useState<CertificateEntry[]>([
    { name: '', date: '' },
  ]);
  const [awards, setAwards] = useState<AwardEntry[]>([
    { name: '', date: '' },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentCvId, setCurrentCvId] = useState<string | null>(cvId || null);
  const [isExported, setIsExported] = useState(false); // Whether this CV has been exported to PDF
  
  // Load existing CV if editing
  useEffect(() => {
    if (cvId) {
      loadCV();
    }
  }, [cvId]);
  
  const loadCV = async () => {
    if (!cvId) return;
    setLoading(true);
    try {
      const res = await onlineCVService.getOnlineCVById(cvId);
      const cv = res.data;
      // Update template type from loaded CV data
      if (cv.templateType) {
        setActiveTemplateType(cv.templateType);
      }
      setIsExported(!!cv.pdfUrl);
      setFullName(cv.fullName || '');
      setPosition(cv.position || '');
      setPhone(cv.phone || '');
      setEmail(cv.email || '');
      setLink(cv.link || '');
      setAddress(cv.address || '');
      setCareerObjective(cv.careerObjective || '');
      if (cv.education?.length) setEducation(cv.education as EducationEntry[]);
      if (cv.workExperience?.length) setWorkExperience(cv.workExperience as WorkExperienceEntry[]);
      if (cv.skills?.length) setSkills(cv.skills as SkillEntry[]);
      if (cv.activities?.length) setActivities(cv.activities as ActivityEntry[]);
      if (cv.certificates?.length) setCertificates(cv.certificates as CertificateEntry[]);
      if (cv.awards?.length) setAwards(cv.awards as AwardEntry[]);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải CV');
    } finally {
      setLoading(false);
    }
  };
  
  const buildCVData = (): CreateOnlineCVDto => ({
    templateType: activeTemplateType as 'template1' | 'template2',
    fullName,
    position,
    phone,
    email,
    link,
    address,
    careerObjective,
    education: education.filter(e => e.schoolName),
    workExperience: workExperience.filter(e => e.companyName),
    skills: skills.filter(s => s.name),
    activities: isTemplate1 ? activities.filter(a => a.organizationName) : undefined,
    certificates: !isTemplate1 ? certificates.filter(c => c.name) : undefined,
    awards: !isTemplate1 ? awards.filter(a => a.name) : undefined,
  });

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }
    
    setSaving(true);
    try {
      const data = buildCVData();
      
      let result;
      if (currentCvId) {
        result = await onlineCVService.updateOnlineCV(currentCvId, data);
      } else {
        result = await onlineCVService.createOnlineCV(data);
        setCurrentCvId(result.data._id);
      }
      
      Alert.alert('Thành công', 'Đã lưu CV');
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể lưu CV');
    } finally {
      setSaving(false);
    }
  };

  // Save changes + re-export PDF (for already-exported CVs)
  const handleSaveAndExport = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }
    if (!currentCvId) return;

    setExporting(true);
    try {
      // 1. Save content changes first
      const data = buildCVData();
      await onlineCVService.updateOnlineCV(currentCvId, data);

      // 2. Re-export PDF (backend will update existing UserCV)
      await onlineCVService.exportToPdf(currentCvId);

      setIsExported(true);
      Alert.alert(
        'Thành công',
        'CV đã được cập nhật và xuất PDF mới',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Xem CV', onPress: () => navigation.navigate('MyCVs') },
        ]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật CV');
    } finally {
      setExporting(false);
    }
  };
  
  const handleExport = async () => {
    if (!currentCvId) {
      Alert.alert('Thông báo', 'Vui lòng lưu CV trước khi xuất PDF');
      return;
    }
    
    setExporting(true);
    try {
      const result = await onlineCVService.exportToPdf(currentCvId);
      setIsExported(true);
      Alert.alert(
        'Thành công',
        'CV đã được xuất và lưu vào danh sách CV của bạn',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Xem CV', onPress: () => navigation.navigate('MyCVs') },
        ]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xuất PDF');
    } finally {
      setExporting(false);
    }
  };
  
  // Helper for array field updates
  const updateArrayField = <T extends object>(
    arr: T[],
    setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    field: keyof T,
    value: string
  ) => {
    const newArr = [...arr];
    (newArr[index] as any)[field] = value;
    setArr(newArr);
  };
  
  const addArrayItem = <T extends object>(
    arr: T[],
    setArr: React.Dispatch<React.SetStateAction<T[]>>,
    newItem: T
  ) => {
    setArr([...arr, newItem]);
  };
  
  const removeArrayItem = <T extends object>(
    arr: T[],
    setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number
  ) => {
    if (arr.length <= 1) return;
    setArr(arr.filter((_, i) => i !== index));
  };
  
  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    multiline = false
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray[400]}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person-outline" size={18} color={COLORS.primary} /> Thông tin cá nhân
            </Text>
            {renderInput('Họ và tên *', fullName, setFullName, 'Nguyễn Văn A')}
            {renderInput('Vị trí ứng tuyển', position, setPosition, 'Frontend Developer')}
            {renderInput('Số điện thoại', phone, setPhone, '0123 456 789')}
            {renderInput('Email', email, setEmail, 'example@gmail.com')}
            {renderInput('Link (LinkedIn/Portfolio)', link, setLink, 'linkedin.com/in/yourname')}
            {renderInput('Địa chỉ', address, setAddress, 'Quận 1, TP. Hồ Chí Minh')}
          </View>
          
          {/* Career Objective */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="flag-outline" size={18} color={COLORS.primary} /> Mục tiêu nghề nghiệp
            </Text>
            {renderInput('', careerObjective, setCareerObjective, 'Mục tiêu nghề nghiệp của bạn...', true)}
          </View>
          
          {/* Education */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="school-outline" size={18} color={COLORS.primary} /> Học vấn
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addArrayItem(education, setEducation, { schoolName: '', major: '', startDate: '', endDate: '', description: '' })}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            {education.map((edu, index) => (
              <View key={index} style={styles.arrayItem}>
                {education.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeArrayItem(education, setEducation, index)}
                  >
                    <Ionicons name="close" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
                {renderInput('Tên trường', edu.schoolName, (v) => updateArrayField(education, setEducation, index, 'schoolName', v), 'Đại học ABC')}
                {renderInput('Ngành học', edu.major, (v) => updateArrayField(education, setEducation, index, 'major', v), 'Công nghệ thông tin')}
                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    {renderInput('Bắt đầu', edu.startDate, (v) => updateArrayField(education, setEducation, index, 'startDate', v), '09/2018')}
                  </View>
                  <View style={styles.halfInput}>
                    {renderInput('Kết thúc', edu.endDate, (v) => updateArrayField(education, setEducation, index, 'endDate', v), '06/2022')}
                  </View>
                </View>
                {renderInput('Mô tả', edu.description, (v) => updateArrayField(education, setEducation, index, 'description', v), 'GPA: 3.5/4.0', true)}
              </View>
            ))}
          </View>
          
          {/* Work Experience */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} /> Kinh nghiệm làm việc
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addArrayItem(workExperience, setWorkExperience, { companyName: '', position: '', startDate: '', endDate: '', description: '' })}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            {workExperience.map((exp, index) => (
              <View key={index} style={styles.arrayItem}>
                {workExperience.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeArrayItem(workExperience, setWorkExperience, index)}
                  >
                    <Ionicons name="close" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
                {renderInput('Tên công ty', exp.companyName, (v) => updateArrayField(workExperience, setWorkExperience, index, 'companyName', v), 'Công ty TNHH ABC')}
                {renderInput('Vị trí', exp.position, (v) => updateArrayField(workExperience, setWorkExperience, index, 'position', v), 'Software Engineer')}
                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    {renderInput('Bắt đầu', exp.startDate, (v) => updateArrayField(workExperience, setWorkExperience, index, 'startDate', v), '01/2022')}
                  </View>
                  <View style={styles.halfInput}>
                    {renderInput('Kết thúc', exp.endDate, (v) => updateArrayField(workExperience, setWorkExperience, index, 'endDate', v), 'Hiện tại')}
                  </View>
                </View>
                {renderInput('Mô tả công việc', exp.description, (v) => updateArrayField(workExperience, setWorkExperience, index, 'description', v), 'Mô tả công việc của bạn...', true)}
              </View>
            ))}
          </View>
          
          {/* Skills */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="code-outline" size={18} color={COLORS.primary} /> Kỹ năng
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addArrayItem(skills, setSkills, { name: '', description: '' })}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            {skills.map((skill, index) => (
              <View key={index} style={styles.arrayItem}>
                {skills.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeArrayItem(skills, setSkills, index)}
                  >
                    <Ionicons name="close" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
                {renderInput('Tên kỹ năng', skill.name, (v) => updateArrayField(skills, setSkills, index, 'name', v), 'ReactJS')}
                {renderInput('Mô tả', skill.description, (v) => updateArrayField(skills, setSkills, index, 'description', v), '2 năm kinh nghiệm')}
              </View>
            ))}
          </View>
          
          {/* Activities (Template 1) */}
          {isTemplate1 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="people-outline" size={18} color={COLORS.primary} /> Hoạt động
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addArrayItem(activities, setActivities, { organizationName: '', position: '', startDate: '', endDate: '', description: '' })}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              {activities.map((act, index) => (
                <View key={index} style={styles.arrayItem}>
                  {activities.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeArrayItem(activities, setActivities, index)}
                    >
                      <Ionicons name="close" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                  {renderInput('Tên tổ chức', act.organizationName, (v) => updateArrayField(activities, setActivities, index, 'organizationName', v), 'CLB IT')}
                  {renderInput('Vị trí', act.position, (v) => updateArrayField(activities, setActivities, index, 'position', v), 'Thành viên')}
                  <View style={styles.rowInputs}>
                    <View style={styles.halfInput}>
                      {renderInput('Bắt đầu', act.startDate, (v) => updateArrayField(activities, setActivities, index, 'startDate', v), '01/2020')}
                    </View>
                    <View style={styles.halfInput}>
                      {renderInput('Kết thúc', act.endDate, (v) => updateArrayField(activities, setActivities, index, 'endDate', v), '12/2021')}
                    </View>
                  </View>
                  {renderInput('Mô tả', act.description, (v) => updateArrayField(activities, setActivities, index, 'description', v), 'Mô tả hoạt động...', true)}
                </View>
              ))}
            </View>
          )}
          
          {/* Certificates (Template 2) */}
          {!isTemplate1 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="ribbon-outline" size={18} color={COLORS.primary} /> Chứng chỉ
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addArrayItem(certificates, setCertificates, { name: '', date: '' })}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              {certificates.map((cert, index) => (
                <View key={index} style={styles.arrayItem}>
                  {certificates.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeArrayItem(certificates, setCertificates, index)}
                    >
                      <Ionicons name="close" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                  {renderInput('Tên chứng chỉ', cert.name, (v) => updateArrayField(certificates, setCertificates, index, 'name', v), 'TOEIC 800')}
                  {renderInput('Thời gian', cert.date, (v) => updateArrayField(certificates, setCertificates, index, 'date', v), '06/2022')}
                </View>
              ))}
            </View>
          )}
          
          {/* Awards (Template 2) */}
          {!isTemplate1 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="trophy-outline" size={18} color={COLORS.primary} /> Giải thưởng
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addArrayItem(awards, setAwards, { name: '', date: '' })}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              {awards.map((award, index) => (
                <View key={index} style={styles.arrayItem}>
                  {awards.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeArrayItem(awards, setAwards, index)}
                    >
                      <Ionicons name="close" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                  {renderInput('Tên giải thưởng', award.name, (v) => updateArrayField(awards, setAwards, index, 'name', v), 'Sinh viên xuất sắc')}
                  {renderInput('Thời gian', award.date, (v) => updateArrayField(awards, setAwards, index, 'date', v), '2021')}
                </View>
              ))}
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isExported ? (
              // Already exported: single button to save + re-export
              <TouchableOpacity
                style={[styles.actionBtn, styles.exportBtn, { flex: 1 }]}
                onPress={handleSaveAndExport}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Lưu & Xuất PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              // Draft: separate save and export buttons
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.saveBtn]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={20} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Lưu CV</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionBtn, styles.exportBtn, !currentCvId && styles.btnDisabled]}
                  onPress={handleExport}
                  disabled={exporting || !currentCvId}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={20} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Xuất PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 1.5,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: SIZES.md,
    color: COLORS.gray[800],
    backgroundColor: COLORS.gray[50],
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  arrayItem: {
    position: 'relative',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
    marginBottom: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: SIZES.radius,
    gap: 8,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  exportBtn: {
    backgroundColor: COLORS.success,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});

export default CVFormScreen;
