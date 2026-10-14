import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../theme';

export interface UserAvatarProps {
  avatar?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  borderColor?: string;
}

export default function UserAvatar({
  avatar,
  size = 36,
  style,
  textStyle,
  borderColor,
}: UserAvatarProps): React.ReactElement {
  const isImageString =
    typeof avatar === 'string' &&
    (avatar.startsWith('http') ||
      avatar.startsWith('data:') ||
      avatar.startsWith('blob:') ||
      avatar.startsWith('file:') ||
      avatar.startsWith('/') ||
      avatar.length > 50);

  let imageUri: string | null = null;
  if (isImageString && typeof avatar === 'string') {
    if (
      avatar.startsWith('http') ||
      avatar.startsWith('data:') ||
      avatar.startsWith('blob:') ||
      avatar.startsWith('file:') ||
      avatar.startsWith('/')
    ) {
      imageUri = avatar;
    } else {
      imageUri = `data:image/jpeg;base64,${avatar}`;
    }
  }

  if (imageUri) {
    return (
      <View
        style={[
          styles.imageContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: borderColor || 'transparent',
            borderWidth: borderColor ? 1.5 : 0,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Ensure raw base64 or long strings are never displayed inside Text
  const displayEmoji =
    typeof avatar === 'string' && avatar.length <= 10 ? avatar : '👦';

  return (
    <View
      style={[
        styles.textContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: borderColor || 'transparent',
          borderWidth: borderColor ? 1.5 : 0,
        },
        style,
      ]}
    >
      <Text style={[{ fontSize: Math.max(14, size * 0.6) }, textStyle]}>
        {displayEmoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: colors.divider,
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
