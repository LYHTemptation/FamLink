/**
 * 전역 시스템 폰트 배율 고정 유틸리티 (allowFontScaling: false)
 *
 * 안드로이드/iOS 기기 설정에서 시스템 글자 크기를 '크게 / 아주 크게(130%~200%)'로 설정하더라도
 * 앱 내 카드, 탭바, 버튼, 16P 포토북 A5 조판 캔버스가 깨지지 않도록
 * 모든 <Text> 및 <TextInput>의 기본 allowFontScaling을 false로 고정합니다.
 *
 * React 19 + React Native 0.86 환경에서는 함수형 컴포넌트의 defaultProps가 무시되므로
 * JSX Runtime(jsx, jsxs, jsxDEV) 및 React.createElement 레벨에서 함께 주입합니다.
 */

import React from 'react';
import { Text, TextInput } from 'react-native';

// CommonJS require로 jsx-runtime 원본 모듈 객체를 직접 참조하여 다른 컴포넌트 로드 전에 패치
const JsxRuntime: any = require('react/jsx-runtime');
let JsxDevRuntime: any = null;
try {
  JsxDevRuntime = require('react/jsx-dev-runtime');
} catch (_) {}

function isTextOrInputType(type: any): boolean {
  return (
    type === Text ||
    type === TextInput ||
    Boolean(type && (type.displayName === 'Text' || type.displayName === 'TextInput'))
  );
}

function injectNoFontScaling(props: any): any {
  if (!props || typeof props !== 'object') {
    return { allowFontScaling: false };
  }
  if (props.allowFontScaling === undefined) {
    return { ...props, allowFontScaling: false };
  }
  return props;
}

export function setupFontScalingLock(): void {
  if (Text) {
    (Text as any).defaultProps = {
      ...((Text as any).defaultProps || {}),
      allowFontScaling: false,
    };
  }
  if (TextInput) {
    (TextInput as any).defaultProps = {
      ...((TextInput as any).defaultProps || {}),
      allowFontScaling: false,
    };
  }

  try {
    const origCreateElement = React.createElement as any;
    if (origCreateElement && !origCreateElement.__famlinkPatched) {
      const patchedCreateElement: any = function (
        this: any,
        type: any,
        config: any,
        ...children: any[]
      ) {
        const nextConfig = isTextOrInputType(type) ? injectNoFontScaling(config) : config;
        return origCreateElement.call(this, type, nextConfig, ...children);
      };
      patchedCreateElement.__famlinkPatched = true;
      (React as any).createElement = patchedCreateElement;
    }

    if (JsxRuntime && typeof JsxRuntime.jsx === 'function' && !JsxRuntime.jsx.__famlinkPatched) {
      const origJsx = JsxRuntime.jsx;
      const origJsxs = JsxRuntime.jsxs || origJsx;
      const patchedJsx: any = function (type: any, config: any, maybeKey: any) {
        const nextConfig = isTextOrInputType(type) ? injectNoFontScaling(config) : config;
        return origJsx(type, nextConfig, maybeKey);
      };
      const patchedJsxs: any = function (type: any, config: any, maybeKey: any) {
        const nextConfig = isTextOrInputType(type) ? injectNoFontScaling(config) : config;
        return origJsxs(type, nextConfig, maybeKey);
      };
      patchedJsx.__famlinkPatched = true;
      JsxRuntime.jsx = patchedJsx;
      JsxRuntime.jsxs = patchedJsxs;
    }

    if (
      JsxDevRuntime &&
      typeof JsxDevRuntime.jsxDEV === 'function' &&
      !JsxDevRuntime.jsxDEV.__famlinkPatched
    ) {
      const origJsxDEV = JsxDevRuntime.jsxDEV;
      const patchedJsxDEV: any = function (
        type: any,
        config: any,
        maybeKey: any,
        isStaticChildren: any,
        source: any,
        self: any
      ) {
        const nextConfig = isTextOrInputType(type) ? injectNoFontScaling(config) : config;
        return origJsxDEV(type, nextConfig, maybeKey, isStaticChildren, source, self);
      };
      patchedJsxDEV.__famlinkPatched = true;
      JsxDevRuntime.jsxDEV = patchedJsxDEV;
    }
  } catch (_) {}
}

setupFontScalingLock();
