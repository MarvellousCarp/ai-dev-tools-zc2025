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
    expect(languageOptions.javascript.label).toBe('JavaScript');
    expect(extensionLanguageName('javascript')).toBe('JavaScript');
  });

  it('enables Python syntax highlighting through CodeMirror', () => {
    expect(languageOptions.python.label).toBe('Python');
    expect(extensionLanguageName('python')).toBe('Python');
  });
});
