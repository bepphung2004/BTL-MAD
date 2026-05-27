import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { ICompany } from '../../types';

interface CompanyCardProps {
  company: ICompany;
  onPress: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  onPress,
  onFollow,
  isFollowing = false,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{ uri: company.logo || 'https://via.placeholder.com/80' }}
        style={styles.logo}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {company.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.metaText} numberOfLines={1}>
            {company.address}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="briefcase-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.metaText}>{company.jobCount || 0} việc làm</Text>
        </View>
      </View>
      {onFollow && (
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={onFollow}
        >
          <Ionicons
            name={isFollowing ? 'heart' : 'heart-outline'}
            size={18}
            color={isFollowing ? COLORS.white : COLORS.primary}
          />
        </TouchableOpacity>
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
  logo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metaText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
    flex: 1,
  },
  followButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});
