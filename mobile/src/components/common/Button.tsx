import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, SIZES } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const getButtonStyle = (): ViewStyle[] => {
    const sizeStyles: Record<string, ViewStyle> = {
      sm: styles.button_sm,
      md: styles.button_md,
      lg: styles.button_lg,
    };
    const variantStyles: Record<string, ViewStyle> = {
      primary: styles.buttonPrimary,
      secondary: styles.buttonSecondary,
      outline: styles.buttonOutline,
      danger: styles.buttonDanger,
    };
    const baseStyle: ViewStyle[] = [styles.button, sizeStyles[size], variantStyles[variant]];
    if (disabled || loading) {
      baseStyle.push(styles.buttonDisabled);
    }
    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const sizeStyles: Record<string, TextStyle> = {
      sm: styles.text_sm,
      md: styles.text_md,
      lg: styles.text_lg,
    };
    const baseStyle: TextStyle[] = [styles.text, sizeStyles[size]];
    if (variant === 'outline') {
      baseStyle.push(styles.textOutline);
    } else {
      baseStyle.push(styles.textDefault);
    }
    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.white} />
      ) : (
        <>
          {icon}
          <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    gap: 8,
  },
  button_sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buttonDanger: {
    backgroundColor: COLORS.danger,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: '600',
  },
  text_sm: {
    fontSize: SIZES.sm,
  },
  text_md: {
    fontSize: SIZES.md,
  },
  text_lg: {
    fontSize: SIZES.lg,
  },
  textDefault: {
    color: COLORS.white,
  },
  textOutline: {
    color: COLORS.primary,
  },
});
