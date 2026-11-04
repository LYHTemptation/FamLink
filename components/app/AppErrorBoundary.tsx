import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { colors } from '../../theme';
import { reportError } from '../../utils/errorHandler';

export interface AppErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  componentStack: string;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      componentStack: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || '알 수 없는 렌더링 오류가 발생했습니다.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const stack = errorInfo?.componentStack || error?.stack || '';
    this.setState({ componentStack: stack });

    reportError(error, {
      severity: 'fatal',
      source: 'ui_boundary',
      metadata: {
        componentStack: stack.slice(0, 1500),
      },
    });
  }

  handleRecover = (): void => {
    this.setState({
      hasError: false,
      errorMessage: '',
      componentStack: '',
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <AlertTriangle size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>일시적인 화면 오류가 발생했어요</Text>
          <Text style={styles.subtitle}>
            오류 내역이 관리자에게 자동으로 기록되었습니다.{'\n'}아래 버튼을 누르면 안전하게 화면을 복구합니다.
          </Text>

          {this.state.errorMessage ? (
            <ScrollView style={styles.errorBox}>
              <Text style={styles.errorCodeText}>
                {this.state.errorMessage}
              </Text>
            </ScrollView>
          ) : null}

          <TouchableOpacity
            style={styles.recoverBtn}
            onPress={this.handleRecover}
            activeOpacity={0.85}
          >
            <RotateCcw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.recoverBtnText}>화면 안전 복구하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBox: {
    width: '100%',
    maxHeight: 110,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  errorCodeText: {
    fontSize: 11.5,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  recoverBtn: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoverBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
