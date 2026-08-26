module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/__mocks__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*|zustand)',
  ],
  moduleNameMapper: {
    '\\.png$': '<rootDir>/__mocks__/fileMock.js',
    '\\.jpg$': '<rootDir>/__mocks__/fileMock.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
};
