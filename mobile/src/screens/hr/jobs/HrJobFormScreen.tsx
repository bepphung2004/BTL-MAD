import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import { RichEditor, RichToolbar } from 'react-native-pell-rich-editor';
import { useFocusEffect } from '@react-navigation/native';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { useAppSelector } from '../../../store/hooks';
import { jobService } from '../../../services/jobService';
import { skillService } from '../../../services/skillService';
import { COLORS } from '../../../constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import debounce from 'lodash.debounce';
import { useNavigation, useRoute } from '@react-navigation/native';

const HrJobFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.company?._id;
  const jobData = (route.params as any)?.job;

  const [form, setForm] = useState({
    name: '',
    description: '',
    skills: [] as any[],
    salary: '',
    level: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    quantity: '',
    location: '',
    isActive: true,
  });
  const editor = useRef<RichEditor>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skillOptions, setSkillOptions] = useState<any[]>([]);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillSearch, setSkillSearch] = useState('');
  const [creatingSkill, setCreatingSkill] = useState(false);

  useEffect(() => {
    if (jobData) {
      const parseBool = (v: any) => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') {
          const t = v.trim().toLowerCase();
          if (t === 'false' || t === '0' || t === 'no' || t === 'n') return false;
          if (t === 'true' || t === '1' || t === 'yes' || t === 'y') return true;
          return false;
        }
        if (typeof v === 'number') return v !== 0;
        return Boolean(v);
      };
      
      setForm((p) => ({
        ...p,
        name: jobData.name || '',
        description: jobData.description || '',
        skills: jobData.skills || [],
        salary: jobData.salary ? String(jobData.salary) : '',
        level: jobData.level || '',
        startDate: jobData.startDate ? new Date(jobData.startDate) : undefined,
        endDate: jobData.endDate ? new Date(jobData.endDate) : undefined,
        quantity: jobData.quantity ? String(jobData.quantity) : '',
        location: jobData.location || '',
        isActive: jobData.isActive !== undefined ? parseBool(jobData.isActive) : false,
      }));
    }
  }, [jobData]);

  
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      const parseBool = (v: any) => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') {
          const t = v.trim().toLowerCase();
          if (t === 'false' || t === '0' || t === 'no' || t === 'n') return false;
          if (t === 'true' || t === '1' || t === 'yes' || t === 'y') return true;
          return false;
        }
        if (typeof v === 'number') return v !== 0;
        return Boolean(v);
      };

      const fetchFresh = async () => {
        if (!jobData || !jobData._id) return;
        setLoading(true);
        try {
          const [jobRes, skillsRes] = await Promise.all([
            jobService.getJobById(jobData._id),
            skillService.getSkills(),
          ]);

          if (!mounted) return;

          const fresh = jobRes.data;
          const items = skillsRes.data?.result || [];
          setSkillOptions(items);

          const mappedSkills = (fresh.skills || []).map((s: any) => {
            if (typeof s === 'string') {
              const found = items.find((it: any) => it._id === s || it.name === s);
              return found ? found : { _id: s, name: s };
            }
            return s;
          });

          setForm({
            name: fresh.name || '',
            description: fresh.description || '',
            skills: mappedSkills,
            salary: fresh.salary ? String(fresh.salary) : '',
            level: fresh.level || '',
            startDate: fresh.startDate ? new Date(fresh.startDate) : undefined,
            endDate: fresh.endDate ? new Date(fresh.endDate) : undefined,
            quantity: fresh.quantity ? String(fresh.quantity) : '',
            location: fresh.location || '',
            isActive: fresh.isActive !== undefined ? parseBool(fresh.isActive) : false,
          });
        } catch (err) {
          // ignore
        } finally {
          if (mounted) setLoading(false);
        }
      };

      fetchFresh();
      return () => { mounted = false; };
    }, [jobData?._id]),
  );

  // load all skills for the select
  const loadSkills = async () => {
    try {
      const res = await skillService.getSkills();
      const items = res.data.result || [];
      
      setSkillOptions(items);

      
      if (jobData && jobData.skills && jobData.skills.length > 0) {
        const mapped = jobData.skills.map((s: any) => {
          if (typeof s === 'string') {
            const found = items.find((it: any) => it._id === s || it.name === s);
            return found ? found : { _id: s, name: s };
          }
          return s;
        });
        setForm((p) => ({ ...p, skills: mapped }));
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const toggleSkill = (s: any) => {
    const exists = form.skills.find((x: any) => x._id === s._id || x.name === s.name);
    if (exists) setForm((prev) => ({ ...prev, skills: prev.skills.filter((x: any) => x._id !== s._id && x.name !== s.name) }));
    else setForm((prev) => ({ ...prev, skills: [...prev.skills, s] }));
    setErrors((p) => {
      const copy = { ...p };
      delete copy.skills;
      return copy;
    });
  };

  // Filter skills by search query
  const filteredSkillOptions = skillSearch.trim()
    ? skillOptions.filter((s: any) => s.name?.toLowerCase().includes(skillSearch.trim().toLowerCase()))
    : skillOptions;

  const handleAddNewSkill = async () => {
    const trimmedName = skillSearch.trim().toUpperCase();
    if (!trimmedName) return;

    // Check if skill already exists in options
    const exists = skillOptions.some((s: any) => s.name === trimmedName);
    if (exists) {
      Alert.alert('Thông báo', 'Skill này đã tồn tại');
      return;
    }

    setCreatingSkill(true);
    try {
      const res = await skillService.createSkill(trimmedName);
      const newSkill = res.data;
      // Add to available options and select it
      setSkillOptions((prev) => [...prev, newSkill]);
      setForm((prev) => ({ ...prev, skills: [...prev.skills, newSkill] }));
      setSkillSearch('');
      setErrors((p) => { const c = { ...p }; delete c.skills; return c; });
      Alert.alert('Thành công', `Đã tạo skill "${trimmedName}"`);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo skill');
    } finally {
      setCreatingSkill(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name || form.name.trim().length === 0) e.name = 'Tên công việc là bắt buộc';
    if (!form.description || form.description.trim().length === 0) e.description = 'Mô tả là bắt buộc';
    if (!form.skills || form.skills.length === 0) e.skills = 'Phải chọn ít nhất 1 kỹ năng';
    if (!form.salary || isNaN(Number(form.salary))) e.salary = 'Lương hợp lệ là bắt buộc';
    if (!form.level || form.level.trim().length === 0) e.level = 'Level là bắt buộc';
    if (!form.startDate) e.startDate = 'Ngày bắt đầu là bắt buộc';
    if (!form.endDate) e.endDate = 'Ngày kết thúc là bắt buộc';
    if (form.startDate && form.endDate && form.startDate > form.endDate) e.startDate = 'Ngày bắt đầu không được sau ngày kết thúc';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0) e.quantity = 'Số lượng phải là số lớn hơn 0';
    if (!form.location || form.location.trim().length === 0) e.location = 'Địa điểm là bắt buộc';
    return e;
  };

  const handleSubmit = async () => {
    if (!companyId) {
      Alert.alert('Lỗi', 'Không tìm thấy công ty của bạn');
      return;
    }
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    const payload: any = {
      name: form.name,
      description: form.description,
      skills: form.skills.map((s: any) => (s.name ?? s._id ?? s)),
      salary: form.salary ? Number(form.salary) : undefined,
      level: form.level,
      startDate: form.startDate ? form.startDate.toISOString() : undefined,
      endDate: form.endDate ? form.endDate.toISOString() : undefined,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      location: form.location,
      isActive: form.isActive,
      company: { _id: companyId },
    };

    setLoading(true);
    try {
      console.log('Submitting job payload:', payload);
      if (jobData) {
        await jobService.updateJob(jobData._id, payload);
        Alert.alert('Thành công', 'Cập nhật công việc thành công', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await jobService.createJob(payload as any);
        Alert.alert('Thành công', 'Tạo công việc thành công', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err: any) {
      console.log('Error submitting job:', err);
      Alert.alert('Lỗi', 'Không thể lưu công việc');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Input label="Tên công việc" placeholder="Nhập tên công việc" value={form.name} onChangeText={(v) => { setForm((p) => ({ ...p, name: v })); setErrors((p) => { const c = { ...p }; delete c.name; return c; }); }} />
      {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Mô tả công việc</Text>
        <RichEditor
          ref={editor}
          placeholder="Nhập mô tả công việc..."
          style={styles.richEditor}
          initialHeight={200}
          initialContentHTML={form.description}
          onChange={(html) => {
            setForm((p) => ({ ...p, description: html }));
            setErrors((p) => { const c = { ...p }; delete c.description; return c; });
          }}
        />
        <RichToolbar editor={editor} style={styles.richToolbar} />
        {errors.description ? <Text style={{ color: 'red', marginTop: 4 }}>{errors.description}</Text> : null}
      </View>
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Kỹ năng</Text>
        <TouchableOpacity onPress={() => setSkillModalVisible(true)} style={styles.input}>
          <Text>{form.skills.length > 0 ? form.skills.map((s: any) => s.name || s).join(', ') : 'Chọn kỹ năng...'}</Text>
        </TouchableOpacity>
        {errors.skills ? <Text style={styles.errorText}>{errors.skills}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {form.skills.map((s: any, idx: number) => (
            <View key={String(s?._id ?? s?.name ?? s) + '-' + idx} style={{ backgroundColor: COLORS.gray[100], padding: 6, borderRadius: 6, marginRight: 6, marginBottom: 6 }}>
              <Text>{s.name || s}</Text>
            </View>
          ))}
        </View>
      </View>

      <Modal visible={skillModalVisible} animationType="slide" onRequestClose={() => { setSkillModalVisible(false); setSkillSearch(''); }}>
        <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.background }}>
          <Text style={{ fontWeight: '700', marginBottom: 12 }}>Chọn kỹ năng</Text>
          
          {/* Search input */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: COLORS.gray[200], paddingHorizontal: 12, marginBottom: 8 }}>
            <TextInput
              style={{ flex: 1, paddingVertical: 10 }}
              value={skillSearch}
              onChangeText={setSkillSearch}
              placeholder="Tìm hoặc tạo skill mới..."
              autoCapitalize="none"
            />
            {skillSearch.length > 0 && (
              <TouchableOpacity onPress={() => setSkillSearch('')}>
                <Text style={{ color: COLORS.gray[400], fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Add new skill button - shown when search doesn't match existing skills */}
          {skillSearch.trim() &&
            !skillOptions.some((s: any) => s.name?.toLowerCase() === skillSearch.trim().toLowerCase()) && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#e6f9ee', borderRadius: 8, marginBottom: 8 }}
                onPress={handleAddNewSkill}
                disabled={creatingSkill}
              >
                <Text style={{ color: COLORS.primary, fontSize: 18, marginRight: 8 }}>＋</Text>
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                  {creatingSkill ? 'Đang tạo...' : `Tạo skill mới: "${skillSearch.trim().toUpperCase()}"`}
                </Text>
              </TouchableOpacity>
            )}

          <FlatList
            data={filteredSkillOptions}
            keyExtractor={(i, index) => String(i?._id ?? i?.name ?? i ?? index)}
            renderItem={({ item }) => {
              const selected = !!form.skills.find((s: any) => s._id === item._id || s.name === item.name);
              return (
                <TouchableOpacity onPress={() => toggleSkill(item)} style={{ paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.gray[200] }}>
                  <Text>{item.name}</Text>
                  <Text style={{ color: selected ? COLORS.primary : COLORS.gray[500] }}>{selected ? '✓' : ''}</Text>
                </TouchableOpacity>
              );
            }}
          />
          <View style={{ marginTop: 12 }}>
            <Button title="Xong" onPress={() => { setSkillModalVisible(false); setSkillSearch(''); }} />
          </View>
        </View>
      </Modal>

      <Input label="Lương" placeholder="Nhập lương" keyboardType="numeric" value={form.salary} onChangeText={(v) => { setForm((p) => ({ ...p, salary: v })); setErrors((p) => { const c = { ...p }; delete c.salary; return c; }); }} />
      {errors.salary ? <Text style={styles.errorText}>{errors.salary}</Text> : null}
      <Input label="Level" placeholder="Ví dụ: Junior, Senior" value={form.level} onChangeText={(v) => { setForm((p) => ({ ...p, level: v })); setErrors((p) => { const c = { ...p }; delete c.level; return c; }); }} />
      {errors.level ? <Text style={styles.errorText}>{errors.level}</Text> : null}


      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Ngày bắt đầu</Text>
        <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.input}>
          <Text>{form.startDate ? form.startDate.toLocaleDateString() : 'Chọn ngày bắt đầu'}</Text>
        </TouchableOpacity>
        {errors.startDate ? <Text style={styles.errorText}>{errors.startDate}</Text> : null}
        {showStartPicker && (
          <DateTimePicker value={form.startDate || new Date()} mode="date" display="default" onChange={(e, d) => { setShowStartPicker(false); if (d) { setForm((p) => ({ ...p, startDate: d })); setErrors((p) => { const c = { ...p }; delete c.startDate; return c; }); } }} />
        )}
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Ngày kết thúc</Text>
        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.input}>
          <Text>{form.endDate ? form.endDate.toLocaleDateString() : 'Chọn ngày kết thúc'}</Text>
        </TouchableOpacity>
        {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}
        {showEndPicker && (
          <DateTimePicker value={form.endDate || new Date()} mode="date" display="default" onChange={(e, d) => { setShowEndPicker(false); if (d) { setForm((p) => ({ ...p, endDate: d })); setErrors((p) => { const c = { ...p }; delete c.endDate; return c; }); } }} />
        )}
      </View>

      <Input label="Số lượng" placeholder="Số lượng ứng viên" keyboardType="numeric" value={form.quantity} onChangeText={(v) => { setForm((p) => ({ ...p, quantity: v })); setErrors((p) => { const c = { ...p }; delete c.quantity; return c; }); }} />
      {errors.quantity ? <Text style={styles.errorText}>{errors.quantity}</Text> : null}
      <Input label="Địa điểm" placeholder="Địa điểm" value={form.location} onChangeText={(v) => { setForm((p) => ({ ...p, location: v })); setErrors((p) => { const c = { ...p }; delete c.location; return c; }); }} />
      {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}

      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700' }}>Trạng thái</Text>
        <TouchableOpacity onPress={() => setForm((p) => ({ ...p, isActive: !p.isActive }))} style={{ padding: 8, backgroundColor: form.isActive ? COLORS.primary : COLORS.gray[200], borderRadius: 6 }}>
          <Text style={{ color: '#fff' }}>{form.isActive ? 'Đang tuyển' : 'Ngừng tuyển'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title={jobData ? 'Cập nhật' : 'Tạo'} onPress={handleSubmit} loading={loading} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gray[200] },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 6 },
  richEditor: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: COLORS.gray[200], minHeight: 120, marginBottom: 8 },
  richToolbar: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: 8 },
});

export default HrJobFormScreen;
