import { describe, expect, it } from 'vitest';
import { languageOptions } from '../../components/languageOptions';

const extensionLanguageName = (langId: keyof typeof languageOptions) => {
  const extension = languageOptions[langId].extension();
  // LanguageSupport exposes the parsed language name when using CodeMirror language packages
  // such as @codemirror/lang-javascript or @codemirror/lang-python.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (extension as any)?.language?.name as string | undefined;
};

describe('languageOptions syntax highlighting', () => {
  it('enables JavaScript syntax highlighting through CodeMirror', () => {
    // Our UI label
    expect(languageOptions.javascript.label).toBe('JavaScript');
    // Under the hood we use the TypeScript language support for JavaScript,
    // so CodeMirror reports "typescript" as the language name.
    expect(extensionLanguageName('javascript')).toBe('typescript');
  });

  it('enables Python syntax highlighting through CodeMirror', () => {
    // Our UI label
    expect(languageOptions.python.label).toBe('Python');
    // CodeMirror’s internal language name is "python"
    expect(extensionLanguageName('python')).toBe('python');
  });
});
