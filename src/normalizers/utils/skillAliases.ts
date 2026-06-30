// ---------------------------------------------------------------------------
// skillAliases.ts
// Configurable skill alias map.
//
// Keys   : the raw / aliased name (case-insensitive lookup).
// Values : the canonical display name.
//
// To add or override mappings, pass a custom `SkillAliasMap` to
// `normalizeSkills()` — it is merged on top of the defaults.
// ---------------------------------------------------------------------------

/**
 * A mapping of alias → canonical name.
 * Keys should be lowercase for case-insensitive lookup.
 */
export type SkillAliasMap = Record<string, string>;

/**
 * Default skill alias mappings shipped with the pipeline.
 * All keys are stored in lowercase; lookup is always done in lowercase.
 */
export const DEFAULT_SKILL_ALIASES: SkillAliasMap = {
  // JavaScript variants
  'js':             'JavaScript',
  'javascript':     'JavaScript',
  'es6':            'JavaScript',
  'es2015':         'JavaScript',
  'ecmascript':     'JavaScript',

  // TypeScript
  'ts':             'TypeScript',
  'typescript':     'TypeScript',

  // Node.js variants
  'nodejs':         'Node.js',
  'node.js':        'Node.js',
  'node js':        'Node.js',
  'node':           'Node.js',

  // React
  'reactjs':        'React',
  'react.js':       'React',
  'react js':       'React',
  'react':          'React',

  // Vue
  'vuejs':          'Vue.js',
  'vue.js':         'Vue.js',
  'vue':            'Vue.js',

  // Angular
  'angularjs':      'Angular',
  'angular.js':     'Angular',
  'angular js':     'Angular',
  'angular':        'Angular',

  // Python
  'python3':        'Python',
  'python 3':       'Python',
  'python':         'Python',

  // C / C++
  'c plus plus':    'C++',
  'cplusplus':      'C++',
  'c/c++':          'C++',
  'c++':            'C++',

  // C#
  'c sharp':        'C#',
  'csharp':         'C#',
  'c#':             'C#',

  // SQL / databases
  'sql':            'SQL',
  'mysql':          'MySQL',
  'postgresql':     'PostgreSQL',
  'postgres':       'PostgreSQL',
  'mongodb':        'MongoDB',
  'mongo':          'MongoDB',
  'mongo db':       'MongoDB',

  // Cloud
  'aws':            'AWS',
  'amazon web services': 'AWS',
  'gcp':            'GCP',
  'google cloud':   'GCP',
  'azure':          'Azure',
  'microsoft azure': 'Azure',

  // DevOps / tooling
  'docker':         'Docker',
  'kubernetes':     'Kubernetes',
  'k8s':            'Kubernetes',
  'ci/cd':          'CI/CD',
  'cicd':           'CI/CD',
  'git':            'Git',
  'github':         'GitHub',
  'gitlab':         'GitLab',

  // Misc languages
  'golang':         'Go',
  'go lang':        'Go',
  'go':             'Go',
  'rust':           'Rust',
  'java':           'Java',
  'kotlin':         'Kotlin',
  'swift':          'Swift',
  'ruby':           'Ruby',
  'php':            'PHP',
  'scala':          'Scala',
  'r':              'R',
};
