import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function UserAvatar({
  avatar,
  size = 36,
  style,
  textStyle,
  borderColor,
}) {
  const isImage = typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('data:image'));

  if (isImage) {
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
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>
    );
  }

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
        {avatar || '👦'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
