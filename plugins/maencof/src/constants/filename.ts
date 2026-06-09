/** 파일명 세그먼트 최대 UTF-8 바이트. 파일시스템 255B 한도 대비 보수적. */
export const MAX_FILENAME_SEGMENT_BYTES = 200;

/** 명시적 filename이 허용하는 최대 하위 디렉토리 중첩 깊이. */
export const MAX_FILENAME_SUBDIR_DEPTH = 2;

/** 세그먼트가 바이트 예산으로 절단될 때 덧붙는 충돌 회피 해시 길이(hex chars). */
export const FILENAME_SLUG_HASH_LENGTH = 8;
