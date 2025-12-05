import type { Extension } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';

export type LanguageId = 'javascript' | 'typescript' | 'python' | 'cpp' | 'java';

export type LanguageOption = {
  id: LanguageId;
  label: string;
  sample: string;
  extension: () => Extension;
};

export const languageOptions: Record<LanguageId, LanguageOption> = {
  javascript: {
    id: 'javascript',
    label: 'JavaScript',
    sample: `// Write JavaScript here\nfunction sum(a, b) {\n  return a + b;\n}\n\nconsole.log('Ready to interview!');\nconsole.log('2 + 2 =', sum(2, 2));`,
    extension: () => javascript({ jsx: true, typescript: true }),
  },
  typescript: {
    id: 'typescript',
    label: 'TypeScript',
    sample: `// TypeScript example\ntype Candidate = { name: string; years: number };\n\nconst applicant: Candidate = { name: 'Alex', years: 5 };\n\nconst format = (candidate: Candidate) => candidate.name + ' (' + candidate.years + 'y)';\nconsole.log('Candidate:', format(applicant));`,
    extension: () => javascript({ jsx: true, typescript: true }),
  },

  python: {
    id: 'python',
    label: 'Python',
    sample: `# Python sample\n\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint("fib(10)=", fib(10))`,
    extension: () => python(),
  },
  cpp: {
    id: 'cpp',
    label: 'C++',
    sample: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello, interviewer!" << endl;\n    return 0;\n}',
    extension: () => cpp(),
  },
  java: {
    id: 'java',
    label: 'Java',
    sample: 'public class Interview {\n  public static void main(String[] args) {\n    System.out.println("Pair up and code!");\n  }\n}',
    extension: () => java(),
  },
};

export function getLanguageOption(languageId: LanguageId): LanguageOption {
  return languageOptions[languageId];
}
