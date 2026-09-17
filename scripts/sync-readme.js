#!/usr/bin/env node

/**
 * sync-readme.js
 * 
 * FamLink 프로젝트의 화면/컴포넌트 변경 사항을 감지하여
 * README.md의 기능 및 컴포넌트 목록이 최신 상태인지 검증하고 동기화 상태를 점검합니다.
 * 
 * 실행: npm run docs:sync 또는 node scripts/sync-readme.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT_DIR, 'README.md');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'components');

function checkDocumentationSync() {
  console.log('🔍 FamLink README.md 기능 및 컴포넌트 동기화 상태 점검 중...\n');

  if (!fs.existsSync(README_PATH)) {
    console.error('❌ README.md 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  const readmeContent = fs.readFileSync(README_PATH, 'utf8');

  // components 디렉토리 내 주요 js 파일 목록 조회
  const componentFiles = fs.readdirSync(COMPONENTS_DIR)
    .filter(file => file.endsWith('.js') && !file.startsWith('.'))
    .sort();

  console.log(`📁 감지된 컴포넌트 목록 (${componentFiles.length}개):`);
  componentFiles.forEach(f => console.log(`   • ${f}`));
  console.log('');

  const missingComponents = [];
  const coveredComponents = [];

  componentFiles.forEach(file => {
    const baseName = file.replace(/\.js$/, '');
    if (readmeContent.includes(file) || readmeContent.includes(baseName)) {
      coveredComponents.push(file);
    } else {
      missingComponents.push(file);
    }
  });

  console.log(`✅ README에 문서화된 컴포넌트 (${coveredComponents.length}/${componentFiles.length}):`);
  coveredComponents.forEach(f => console.log(`   ✓ ${f}`));

  if (missingComponents.length > 0) {
    console.warn(`\n⚠️ README에 누락된 컴포넌트 (${missingComponents.length}개):`);
    missingComponents.forEach(f => console.warn(`   ! ${f}`));
    console.warn('\n👉 새로운 컴포넌트나 기능이 추가되었습니다. README.md 파일의 주요 기능 및 프로젝트 구조 섹션에 설명을 업데이트해 주세요.');
    process.exit(1);
  } else {
    console.log('\n🎉 모든 주요 컴포넌트와 기능이 README.md에 완벽하게 문서화되어 있습니다!');
  }
}

checkDocumentationSync();
