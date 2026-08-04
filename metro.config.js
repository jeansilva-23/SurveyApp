const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// -------------------------------------------------------------------
// FIX: "Cannot use 'import.meta' outside a module"
//
// O zod v4 e @tanstack/react-query são pacotes ESM puros ("type":"module").
// O Metro bundler não suporta import.meta nativamente.
// A solução é habilitar o suporte a Package Exports (campo "exports" do
// package.json) e forçar a condição "require" para obter a versão CJS.
// -------------------------------------------------------------------

// 1) Habilita resolução via campo "exports" do package.json
config.resolver.unstable_enablePackageExports = true;

// 2) Força a usar a condição "require" (CJS) ao invés de "import" (ESM)
//    Isso garante que zod v4, @tanstack/react-query, etc usem o .cjs deles
config.resolver.unstable_conditionNames = [
  'require',
  'default',
  'react-native',
  'browser',
];

// 3) Suporte a extensões .cjs e .mjs
config.resolver.sourceExts = [
  ...config.resolver.sourceExts.filter(ext => ext !== 'cjs' && ext !== 'mjs'),
  'cjs',
  'mjs',
];

module.exports = config;
