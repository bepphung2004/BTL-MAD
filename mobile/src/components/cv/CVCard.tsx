import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { IUserCV } from '../../types';

/**
 * Determine file type icon and label
 */
const getFileTypeInfo = (url: string): { icon: string; label: string; color: string } => {
  if (!url) return { icon: 'document-text', label: '', color: '#4A90D9' };
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.pdf')) return { icon: 'document', label: 'PDF', color: '#E53E3E' };
  if (lowerUrl.endsWith('.docx') || lowerUrl.endsWith('.doc')) return { icon: 'document-text', label: 'DOCX', color: '#2B6CB0' };
  return { icon: 'document-text', label: '', color: '#4A90D9' };
};

interface CVCardProps {
  cv: IUserCV;
  onPress: () => void;
  onSetPrimary?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}

export const CVCard: React.FC<CVCardProps> = ({
  cv,
  onPress,
  onSetPrimary,
  onDelete,
  onEdit,
  showActions = true,
}) => {
  const fileType = getFileTypeInfo(cv.url);
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        <View style={[styles.iconContainer, { backgroundColor: fileType.color + '10' }]}>
          <Ionicons 
            name={fileType.icon as any} 
            size={32} 
            color={fileType.color} 
          />
          {fileType.label ? <Text style={[styles.pdfLabel, { color: fileType.color }]}>{fileType.label}</Text> : null}
        </View>
        {cv.isPrimary && (
          <View style={styles.primaryBadge}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {cv.title || cv.name || 'CV'}
        </Text>
        <Text style={styles.date}>
          Cập nhật: {new Date(cv.updatedAt).toLocaleDateString('vi-VN')}
        </Text>
        {cv.isPrimary && (
          <View style={styles.primaryTag}>
            <Text style={styles.primaryText}>CV chính</Text>
          </View>
        )}
      </View>

      {showActions && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {!cv.isPrimary && onSetPrimary && (
            <TouchableOpacity style={styles.actionButton} onPress={onSetPrimary}>
              <Ionicons name="star-outline" size={20} color={COLORS.warning} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  primaryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 2,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  date: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
  },
  primaryTag: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  primaryText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});
