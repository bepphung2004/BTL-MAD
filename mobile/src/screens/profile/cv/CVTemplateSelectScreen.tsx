import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../../constants';
import { RootStackParamList } from '../../../navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - SIZES.padding * 2;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CVTemplateSelect'>;
};

const CVTemplateSelectScreen: React.FC<Props> = ({ navigation }) => {
  const templates = [
    {
      id: 'template1',
      name: 'Tiêu chuẩn',
      image: require('../../../../assets/template1.png'),
      tags: ['ATS', 'Đơn giản'],
      colors: ['#e74c3c', '#2c3e50', '#34495e', '#bdc3c7'],
    },
    {
      id: 'template2',
      name: 'Hiện đại',
      image: require('../../../../assets/template2.png'),
      tags: ['Chuyên nghiệp', '2 cột'],
      colors: ['#2980b9', '#27ae60', '#8e44ad', '#e67e22'],
    },
  ];

  const handleSelectTemplate = (templateId: string) => {
    navigation.navigate('CVFormScreen', { templateType: templateId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Chọn Mẫu CV</Text>
          <Text style={styles.subtitle}>
            Chọn một mẫu CV phù hợp với bạn để bắt đầu
          </Text>
        </View>

        {/* Templates Grid */}
        <View style={styles.templatesGrid}>
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleSelectTemplate(template.id)}
              activeOpacity={0.8}
            >
              {/* Thumbnail */}
              <View style={styles.thumbnailContainer}>
                <Image
                  source={template.image}
                  style={styles.thumbnail}
                  resizeMode="contain"
                />
              </View>

              {/* Color Dots */}
              <View style={styles.colorDots}>
                {template.colors.map((color, index) => (
                  <View
                    key={index}
                    style={[styles.colorDot, { backgroundColor: color }]}
                  />
                ))}
              </View>

              {/* Template Name */}
              <Text style={styles.templateName}>{template.name}</Text>

              {/* Tags */}
              <View style={styles.tagsContainer}>
                {template.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={COLORS.info}
          />
          <Text style={styles.infoText}>
            Sau khi điền thông tin, bạn có thể xuất CV sang PDF và lưu vào danh
            sách CV của mình.
          </Text>
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
  scrollContent: {
    padding: SIZES.padding,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.gray[500],
    lineHeight: 22,
  },
  templatesGrid: {
    gap: 20,
  },
  templateCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    paddingBottom: 16,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: COLORS.gray[100],
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  colorDots: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  templateName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[800],
    paddingHorizontal: 12,
    marginTop: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  tag: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '10',
    padding: 16,
    borderRadius: SIZES.radius,
    marginTop: 24,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
});

export default CVTemplateSelectScreen;
