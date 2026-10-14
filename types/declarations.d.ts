declare const Buffer: {
  from(data: any, encoding?: string): any;
  isBuffer(obj: any): boolean;
};

// React Native Web extended styles
import 'react-native';

declare module 'react-native' {
  interface ViewStyle {
    outlineStyle?: string;
    outlineWidth?: number | string;
    outlineColor?: string;
    cursor?: string;
    userSelect?: 'auto' | 'text' | 'none' | 'contain' | 'all';
    transitionProperty?: string;
    transitionDuration?: string;
    boxShadow?: string;
  }
  interface TextStyle {
    outlineStyle?: string;
    outlineWidth?: number | string;
    outlineColor?: string;
    userSelect?: 'auto' | 'text' | 'none' | 'contain' | 'all';
  }
  namespace StyleSheet {
    export const absoluteFillObject: ViewStyle;
  }
}
